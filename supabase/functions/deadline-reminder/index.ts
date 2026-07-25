import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    )

    const now = new Date()
    const tomorrowEnd = new Date(now)
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)
    tomorrowEnd.setHours(23, 59, 59)

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id, user_id, title, due_date, priority")
      .eq("completed", false)
      .gte("due_date", now.toISOString().split("T")[0])
      .lte("due_date", tomorrowEnd.toISOString())
      .order("due_date", { ascending: true })

    if (tasksError || !tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No upcoming deadlines", count: 0 }),
        { status: 200, headers: corsHeaders },
      )
    }

    let sentCount = 0
    let skippedCount = 0
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const todayStr = now.toISOString().split("T")[0]

    for (const task of tasks) {
      // Deduplication: skip if we already sent a notification for this task today
      const { data: existing } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", task.user_id)
        .eq("type", "deadline")
        .eq("link", "/planner")
        .gte("created_at", todayStr)
        .ilike("body", `%${task.title}%`)

      if (existing && existing.length > 0) {
        skippedCount++
        continue
      }

      const dueDate = new Date(task.due_date!)
      const diffMs = dueDate.getTime() - now.getTime()
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const isToday = dueDate.toDateString() === now.toDateString()

      let title = ""
      let body = ""

      if (isToday && diffHours <= 2) {
        title = "Deadline soon!"
        body = `"${task.title}" is due in ${diffHours}h. ${task.priority === "high" ? "This is a high priority task!" : ""}`
      } else if (isToday) {
        title = "Task due today"
        body = `"${task.title}" is due today.`
      } else {
        title = "Task due tomorrow"
        body = `"${task.title}" is due tomorrow.`
      }

      // Save in-app notification
      await supabase.from("notifications").insert({
        user_id: task.user_id,
        type: "deadline",
        title,
        body,
        link: "/planner",
      })

      // Send push notification
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            user_id: task.user_id,
            title,
            body,
            url: "/planner",
          }),
        })
        if (resp.ok) sentCount++
      } catch (pushErr) {
        console.error("Push send failed for task:", task.id, String(pushErr))
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sentCount} deadline push notifications, skipped ${skippedCount} (already notified)`,
        count: sentCount,
        skipped: skippedCount,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err) {
    console.error("deadline-reminder error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders },
    )
  }
})
