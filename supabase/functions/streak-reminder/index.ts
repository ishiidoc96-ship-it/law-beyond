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

    const today = new Date().toISOString().split("T")[0]
    const now = new Date()

    const { data: users, error: usersError } = await supabase
      .from("user_streaks")
      .select("user_id, current_streak, last_post_date, freeze_available")
      .gt("current_streak", 0)
      .eq("today_posted", false)

    if (usersError) {
      console.error("Failed to query user_streaks:", usersError.message)
      return new Response(
        JSON.stringify({ error: "Database query failed" }),
        { status: 500, headers: corsHeaders },
      )
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users need reminders", count: 0 }),
        { status: 200, headers: corsHeaders },
      )
    }

    const results: { user_id: string; sent: boolean; reason?: string }[] = []
    let sentCount = 0
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

    for (const user of users) {
      const lastPost = user.last_post_date ? new Date(user.last_post_date) : null
      const todayDate = new Date(today)
      let daysSinceLastPost = 0
      if (lastPost) {
        daysSinceLastPost = Math.floor(
          (todayDate.getTime() - lastPost.getTime()) / (1000 * 60 * 60 * 24),
        )
      }

      let title = ""
      let body = ""
      let tag = ""

      if (daysSinceLastPost === 0) {
        results.push({ user_id: user.user_id, sent: false, reason: "already_posted" })
        continue
      } else if (daysSinceLastPost === 1) {
        if (user.freeze_available > 0) {
          title = "Streak at risk!"
          body = `You haven't posted today. Your ${user.current_streak}-day streak will break tomorrow! Use your freeze to protect it.`
          tag = "streak-at-risk"
        } else {
          title = "Streak at risk!"
          body = `Post now to keep your ${user.current_streak}-day streak alive!`
          tag = "streak-at-risk"
        }
      } else if (daysSinceLastPost === 2 && user.freeze_available > 0) {
        title = "Save your streak!"
        body = `Your ${user.current_streak}-day streak can still be saved with a freeze. Post now!`
        tag = "streak-save"
      } else {
        const hour = now.getHours()
        if (hour < 12) {
          title = "Good morning! Start your day right"
          body = `Don't forget to post your daily highlight and keep your streak going!`
        } else if (hour < 17) {
          title = "Afternoon reminder"
          body = `Haven't posted today yet? Keep your streak alive!`
        } else {
          title = "Evening reminder"
          body = `Last chance to post today and maintain your streak!`
        }
        tag = "streak-reminder"
      }

      // Save in-app notification
      await supabase.from("notifications").insert({
        user_id: user.user_id,
        type: "streak_reminder",
        title,
        body,
        link: "/streaks",
      })

      // Send push notification via send-push edge function
      try {
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            user_id: user.user_id,
            title,
            body,
            url: "/streaks",
          }),
        })
        if (resp.ok) sentCount++
      } catch (pushErr) {
        console.error("Push send failed for user:", user.user_id, String(pushErr))
      }

      results.push({ user_id: user.user_id, sent: true })
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${users.length} users, sent ${sentCount} push notifications`,
        total: users.length,
        sent: sentCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  } catch (err) {
    console.error("streak-reminder error:", err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: corsHeaders },
    )
  }
})
