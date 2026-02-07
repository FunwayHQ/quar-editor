/**
 * Consent Banner Component
 *
 * Non-blocking bottom banner shown on first visit.
 * Informs users about local storage and lets them choose consent level.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Shield, X } from 'lucide-react';
import { useConsentStore } from '../stores/consentStore';
import { PrivacyPolicy } from './PrivacyPolicy';

export function ConsentBanner() {
  const { hasConsented, grantAll, grantNecessaryOnly } = useConsentStore();
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  if (hasConsented) return null;

  return createPortal(
    <>
      <div className="fixed bottom-0 left-0 right-0 z-[9998] p-4 animate-slide-up">
        <div className="max-w-3xl mx-auto bg-[#18181B]/95 backdrop-blur-lg border border-[#27272A] rounded-xl shadow-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 flex-shrink-0 mt-0.5">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-[#FAFAFA] mb-1">
                Your Privacy Matters
              </h3>
              <p className="text-sm text-[#A1A1AA] leading-relaxed">
                QUAR Editor stores your projects and preferences locally on your device.
                No data is sent to any server.{' '}
                <button
                  onClick={() => setShowPrivacyPolicy(true)}
                  className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
                >
                  Privacy Policy
                </button>
              </p>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={grantAll}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-gradient-to-r from-[#7C3AED] to-[#A855F7] hover:opacity-90 transition-opacity"
                >
                  Accept All
                </button>
                <button
                  onClick={grantNecessaryOnly}
                  className="px-4 py-2 text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A] rounded-lg transition-colors"
                >
                  Necessary Only
                </button>
              </div>
            </div>

            <button
              onClick={grantNecessaryOnly}
              className="p-1 rounded hover:bg-[#27272A] transition-colors flex-shrink-0"
              title="Dismiss (necessary only)"
            >
              <X className="w-4 h-4 text-[#A1A1AA]" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>

      {showPrivacyPolicy && (
        <PrivacyPolicy onClose={() => setShowPrivacyPolicy(false)} />
      )}
    </>,
    document.body
  );
}
