import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  Save,
  Trash2,
  X
} from 'lucide-react';
import { useModal, ModalType } from '../context/ModalContext';

interface ThemeConfig {
  icon: React.ReactNode;
  iconBgClass: string;
  accentBarClass: string;
  buttonGradientClass: string;
  buttonShadowClass: string;
  titleColorClass: string;
  hasCancel: boolean;
  pulseClass: string;
}

const THEMES: Record<ModalType, ThemeConfig> = {
  success: {
    icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
    iconBgClass: 'bg-emerald-50 border border-emerald-100/50',
    accentBarClass: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    buttonGradientClass: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white',
    buttonShadowClass: 'shadow-emerald-500/20',
    titleColorClass: 'text-emerald-950',
    hasCancel: false,
    pulseClass: 'bg-emerald-400/20',
  },
  error: {
    icon: <AlertCircle className="w-6 h-6 text-rose-500" />,
    iconBgClass: 'bg-rose-50 border border-rose-100/50',
    accentBarClass: 'bg-gradient-to-r from-rose-400 to-red-500',
    buttonGradientClass: 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white',
    buttonShadowClass: 'shadow-rose-500/20',
    titleColorClass: 'text-rose-950',
    hasCancel: false,
    pulseClass: 'bg-rose-400/20',
  },
  save: {
    icon: <Save className="w-8 h-8 text-indigo-600" />,
    iconBgClass: 'bg-indigo-50 border border-indigo-100/50',
    accentBarClass: 'bg-gradient-to-r from-indigo-400 to-violet-500',
    buttonGradientClass: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white',
    buttonShadowClass: 'shadow-indigo-500/20',
    titleColorClass: 'text-indigo-950',
    hasCancel: true,
    pulseClass: 'bg-indigo-400/20',
  },
  delete: {
    icon: <Trash2 className="w-8 h-8 text-red-500" />,
    iconBgClass: 'bg-red-50 border border-red-100/50',
    accentBarClass: 'bg-gradient-to-r from-red-500 to-rose-600',
    buttonGradientClass: 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white',
    buttonShadowClass: 'shadow-red-500/20',
    titleColorClass: 'text-red-950',
    hasCancel: true,
    pulseClass: 'bg-red-400/20',
  },
};

export const GlobalModal: React.FC = () => {
  const { modal, closeModal } = useModal();
  const { isOpen, type, title, message, confirmText, cancelText, autoDismiss, duration } = modal;

  // Handle ESC keyboard press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeModal]);

  const currentTheme = type ? THEMES[type] : null;

  if (!isOpen || !currentTheme) return null;

  const dismissDurationSec = (duration || 2000) / 1000;
  const isToast = type === 'success' || type === 'error';

  // Render Top Right Toast Notification for success and error
  if (isToast) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed top-5 right-5 z-[200] w-full max-w-sm pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col"
            >
              {/* Top Accent Line */}
              <div className={`h-1 w-full ${currentTheme.accentBarClass}`} />

              <div className="p-4 flex items-start gap-3">
                {/* Toast Icon Housing */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${currentTheme.iconBgClass}`}>
                  {currentTheme.icon}
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className={`text-sm font-bold leading-snug ${currentTheme.titleColorClass}`}>
                    {title}
                  </h4>
                  <p className="text-slate-500 text-xs font-medium mt-0.5 leading-relaxed">
                    {message}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => closeModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                  aria-label="Close notification"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Countdown Progress Bar */}
              {autoDismiss && (
                <div className="w-full bg-slate-100 h-1 overflow-hidden">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: dismissDurationSec, ease: 'linear' }}
                    className={`h-full ${type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  // Render Center Confirmation Modal for Save and Delete
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeModal(false)}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[6px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, mass: 0.8 }}
            role="dialog"
            aria-modal="true"
            className="relative bg-white/95 backdrop-blur-md w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 z-110 flex flex-col"
          >
            {/* Top decorative accent color bar */}
            <div className={`h-1.5 w-full ${currentTheme.accentBarClass}`} />

            {/* Close button for upper right corner */}
            <button
              onClick={() => closeModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100/50 active:scale-95 transition-all"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>

            {/* Inner Content Area */}
            <div className="p-6 md:p-8 flex flex-col items-center text-center">
              {/* Floating Animated Icon Wrapper */}
              <div className="relative mb-5 flex items-center justify-center">
                {/* Microanimated pulsing waves */}
                <motion.div
                  animate={{
                    scale: [1, 1.25, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.5,
                    ease: "easeInOut",
                  }}
                  className={`absolute inset-0 w-16 h-16 rounded-full ${currentTheme.pulseClass}`}
                />

                {/* Icon Inner Housing */}
                <motion.div
                  whileHover={{ scale: 1.05, rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.4 }}
                  className={`relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${currentTheme.iconBgClass}`}
                >
                  {currentTheme.icon}
                </motion.div>
              </div>

              {/* Text Layout */}
              <h3 className={`text-xl font-bold font-outfit leading-tight ${currentTheme.titleColorClass}`}>
                {title}
              </h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mt-2.5 max-w-sm">
                {message}
              </p>

              {/* Action Buttons Grid */}
              <div className="w-full flex gap-3 mt-8 flex-row">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => closeModal(false)}
                  className="flex-1 px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-2xl hover:bg-slate-50 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  {cancelText || 'Cancel'}
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => closeModal(true)}
                  className={`flex-1 px-5 py-2.5 text-sm font-bold rounded-2xl cursor-pointer transition-all shadow-md ${currentTheme.buttonGradientClass} ${currentTheme.buttonShadowClass}`}
                >
                  {confirmText}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
