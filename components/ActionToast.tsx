'use client';

import { useEffect, useState } from 'react';

export interface ActionEvent {
  id: string;
  type: 'start' | 'complete';
  action: string;
  success?: boolean;
  message?: string;
  timestamp: number;
}

interface ActionToastProps {
  events: ActionEvent[];
}

const ACTION_ICONS: Record<string, string> = {
  book_meeting: '📅',
  check_calendar: '🗓️',
  send_email: '📧',
  search_web: '🔍',
  search_files: '📂',
  create_document: '📄',
  create_spreadsheet: '📊',
  create_folder: '📁',
  upload_file: '⬆️',
  search_notion: '📝',
  notify_admin: '🔔',
  generate_image: '🎨',
  send_whatsapp_client: '💬',
  notify_proposal: '📋',
  unknown: '⚡',
};

const ACTION_LABELS: Record<string, { ar: string; en: string }> = {
  book_meeting: { ar: 'حجز موعد', en: 'Booking meeting' },
  check_calendar: { ar: 'فحص المواعيد', en: 'Checking calendar' },
  send_email: { ar: 'إرسال إيميل', en: 'Sending email' },
  search_web: { ar: 'بحث في الإنترنت', en: 'Searching web' },
  search_files: { ar: 'بحث في الملفات', en: 'Searching files' },
  create_document: { ar: 'إنشاء مستند', en: 'Creating document' },
  create_spreadsheet: { ar: 'إنشاء جدول', en: 'Creating spreadsheet' },
  create_folder: { ar: 'إنشاء مجلد', en: 'Creating folder' },
  upload_file: { ar: 'رفع ملف', en: 'Uploading file' },
  search_notion: { ar: 'بحث في Notion', en: 'Searching Notion' },
  notify_admin: { ar: 'إشعار محمد', en: 'Notifying Mohammed' },
  generate_image: { ar: 'توليد صورة', en: 'Generating image' },
  send_whatsapp_client: { ar: 'إرسال واتساب', en: 'Sending WhatsApp' },
  notify_proposal: { ar: 'إشعار بالعرض', en: 'Sending proposal alert' },
  unknown: { ar: 'تنفيذ أمر', en: 'Executing action' },
};

function SingleToast({ event, onDone }: { event: ActionEvent; onDone: () => void }) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setVisible(true));

    // Auto dismiss completed actions after 4s
    if (event.type === 'complete') {
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(onDone, 400);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [event.type, onDone]);

  const icon = ACTION_ICONS[event.action] || ACTION_ICONS.unknown;
  const label = ACTION_LABELS[event.action] || ACTION_LABELS.unknown;
  const isStart = event.type === 'start';
  const isSuccess = event.success !== false;

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-lg
        border transition-all duration-400 ease-out
        ${visible && !exiting ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${isStart
          ? 'bg-brand-primary/10 border-brand-primary/20'
          : isSuccess
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-red-500/10 border-red-500/20'
        }
      `}
    >
      {/* Icon */}
      <span className="text-xl flex-shrink-0">{icon}</span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-white/90 text-sm font-medium">
          {label.ar}
        </p>
        {isStart && (
          <p className="text-white/40 text-xs mt-0.5">
            جاري التنفيذ...
          </p>
        )}
        {!isStart && isSuccess && (
          <p className="text-emerald-400/80 text-xs mt-0.5">
            ✓ تم بنجاح
          </p>
        )}
        {!isStart && !isSuccess && (
          <p className="text-red-400/80 text-xs mt-0.5">
            ✗ حصل خطأ
          </p>
        )}
      </div>

      {/* Loading spinner for in-progress */}
      {isStart && (
        <div className="w-5 h-5 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin flex-shrink-0" />
      )}

      {/* Success/Error indicator for completed */}
      {!isStart && (
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          isSuccess ? 'bg-emerald-500/20' : 'bg-red-500/20'
        }`}>
          <span className="text-xs">
            {isSuccess ? '✓' : '✗'}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ActionToast({ events }: ActionToastProps) {
  const [activeEvents, setActiveEvents] = useState<ActionEvent[]>([]);

  useEffect(() => {
    if (events.length === 0) return;
    const latest = events[events.length - 1];

    setActiveEvents((prev) => {
      // If it's a completion, replace the matching start event
      if (latest.type === 'complete') {
        const filtered = prev.filter(
          (e) => !(e.type === 'start' && e.action === latest.action)
        );
        return [...filtered, latest];
      }
      return [...prev, latest];
    });
  }, [events]);

  const removeEvent = (id: string) => {
    setActiveEvents((prev) => prev.filter((e) => e.id !== id));
  };

  if (activeEvents.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 space-y-2">
      {activeEvents.map((event) => (
        <SingleToast
          key={event.id}
          event={event}
          onDone={() => removeEvent(event.id)}
        />
      ))}
    </div>
  );
}
