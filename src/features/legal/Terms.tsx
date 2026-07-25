import { useNavigate } from 'react-router-dom'

export default function Terms() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex items-center gap-3 px-4 py-3 max-w-3xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl hover:bg-surface-container-high flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[22px] text-on-surface-variant">arrow_back</span>
          </button>
          <h1 className="font-headline-md text-headline-md text-on-surface">Terms & Conditions</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">1. Acceptance of Terms</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            By accessing and using Law & Beyond ("the App"), you agree to be bound by these Terms and Conditions.
            If you do not agree with any part of these terms, you may not use the App.
          </p>
        </section>

        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">2. Description of Service</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Law & Beyond is a progressive web application designed for law students to manage their academic life,
            track habits, build streaks, manage budgets, and connect with fellow students. The App is provided
            free of charge.
          </p>
        </section>

        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">3. User Accounts</h2>
          <ul className="font-body-md text-body-md text-on-surface-variant leading-relaxed space-y-2 list-disc list-inside">
            <li>You must be at least 13 years old to use the App.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activities that occur under your account.</li>
            <li>You must provide accurate and complete information when creating your account.</li>
            <li>You must notify us immediately of any unauthorized use of your account.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">4. User Content</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mb-3">
            You retain ownership of any content you post, upload, or share through the App ("User Content").
            By posting User Content, you grant us a non-exclusive, worldwide, royalty-free license to use,
            display, and distribute your content within the App.
          </p>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            You agree not to post content that is harmful, offensive, illegal, or violates the rights of others.
          </p>
        </section>

        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">5. Privacy</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            Your use of the App is also governed by our Privacy Policy. We collect and process your data
            in accordance with applicable data protection laws. Your personal information is stored securely
            and is never sold to third parties.
          </p>
        </section>

        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">6. Intellectual Property</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            The App, including its design, code, features, and branding, is the intellectual property of
            Law & Beyond. You may not copy, modify, distribute, or reverse-engineer any part of the App.
          </p>
        </section>

        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">7. Limitation of Liability</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            The App is provided "as is" without warranties of any kind. We are not liable for any damages
            arising from your use of the App. We do not guarantee uninterrupted or error-free service.
          </p>
        </section>

        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">8. Termination</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            We reserve the right to suspend or terminate your account at any time for conduct that violates
            these Terms or is harmful to other users, the App, or third parties.
          </p>
        </section>

        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">9. Changes to Terms</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            We may update these Terms from time to time. Continued use of the App after changes constitutes
            acceptance of the new Terms. We will notify users of significant changes.
          </p>
        </section>

        <section>
          <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">10. Contact</h2>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
            If you have questions about these Terms, please contact us through the app or via our support channels.
          </p>
        </section>

        <div className="pt-4 pb-8 text-center">
          <p className="font-label-sm text-label-sm text-on-surface-variant/60">
            Last updated: July 2026
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 py-3 px-6 rounded-2xl bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container-highest transition-colors active:scale-95"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
