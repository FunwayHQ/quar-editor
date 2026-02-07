/**
 * Privacy Policy Modal
 *
 * Scrollable modal with the full QUAR Editor privacy policy.
 * Accessible from consent banner, WelcomeScreen footer, and Editor settings.
 */

import { createPortal } from 'react-dom';
import { X, Shield } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export function PrivacyPolicy({ onClose }: PrivacyPolicyProps) {
  return createPortal(
    <div
      className="fixed inset-0 bg-[#0A0A0B]/90 backdrop-blur-md flex items-center justify-center z-[10000] p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#18181B] border border-[#27272A] rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-[#27272A] flex-shrink-0">
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-[#FAFAFA] flex-1">
            Privacy Policy
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#27272A] transition-colors"
          >
            <X className="w-5 h-5 text-[#A1A1AA]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <div className="prose prose-sm prose-invert max-w-none space-y-5">
            <p className="text-[#A1A1AA] text-sm">
              Last updated: February 2026
            </p>

            <Section title="Overview">
              <p>
                QUAR Editor is an open-source, browser-based 3D design tool. Your privacy is
                fundamental to our design — the application runs entirely in your browser with
                <strong> no data sent to any external server</strong>.
              </p>
            </Section>

            <Section title="What We Store">
              <p>All data is stored locally on your device:</p>
              <ul>
                <li>
                  <strong>IndexedDB</strong> — Your projects, scenes, and imported assets
                  (textures, 3D models). This is essential for the editor to function.
                </li>
                <li>
                  <strong>localStorage</strong> — Your UI preferences (theme, layout,
                  auto-save settings) and consent status. This is optional.
                </li>
              </ul>
            </Section>

            <Section title="What We Don't Do">
              <ul>
                <li>No analytics or tracking</li>
                <li>No cookies</li>
                <li>No data sent to external servers</li>
                <li>No user accounts or authentication (in the open-source version)</li>
                <li>No third-party scripts or SDKs</li>
              </ul>
            </Section>

            <Section title="Data Retention">
              <p>
                Your data persists in your browser until you explicitly delete it. Clearing
                your browser data or using the "Manage Data" controls on the welcome screen
                will remove stored projects and preferences.
              </p>
            </Section>

            <Section title="Your Rights (GDPR)">
              <p>Under GDPR and similar regulations, you have the right to:</p>
              <ul>
                <li>
                  <strong>Access</strong> — View all stored data (it's on your device)
                </li>
                <li>
                  <strong>Export</strong> — Download your projects as .quar files
                </li>
                <li>
                  <strong>Delete</strong> — Remove all data via "Manage Data" on the welcome
                  screen or by clearing browser storage
                </li>
                <li>
                  <strong>Restrict</strong> — Choose "Necessary Only" to disable preference
                  persistence
                </li>
                <li>
                  <strong>Withdraw consent</strong> — Revoke consent at any time via the
                  welcome screen
                </li>
              </ul>
            </Section>

            <Section title="How to Delete Your Data">
              <ol>
                <li>Go to the Welcome Screen</li>
                <li>Click "Manage Data"</li>
                <li>
                  Choose: clear all projects, clear preferences, or export data before
                  deleting
                </li>
              </ol>
              <p>
                Alternatively, use your browser's "Clear site data" feature to remove
                everything at once.
              </p>
            </Section>

            <Section title="Children's Privacy">
              <p>
                QUAR Editor does not collect any personal data from anyone, including
                children. All data stays on your device.
              </p>
            </Section>

            <Section title="Changes to This Policy">
              <p>
                If this policy changes, the consent version will be incremented and you will
                see the consent banner again.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                For questions about this privacy policy, please open an issue on our{' '}
                <a
                  href="https://github.com/quarteam/quar-editor"
                  className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub repository
                </a>
                .
              </p>
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-[#27272A] flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-90 transition-opacity"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.15s ease-out;
        }
      `}</style>
    </div>,
    document.body
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="text-base font-semibold text-[#FAFAFA] mb-2">{title}</h3>
      <div className="text-sm text-[#A1A1AA] leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_strong]:text-[#FAFAFA]">
        {children}
      </div>
    </section>
  );
}
