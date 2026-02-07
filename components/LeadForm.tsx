'use client';

import { useState } from 'react';
import { getApiUrl } from '../lib/constants';

interface LeadFormProps {
  sessionId: string | null;
  lang: 'en' | 'ar';
  onClose: () => void;
}

const labels = {
  en: {
    title: 'Let\'s stay in touch!',
    subtitle: 'Leave your details and our team will follow up with you',
    name: 'Full Name',
    namePlaceholder: 'e.g. Mohammed Ali',
    email: 'Email Address',
    emailPlaceholder: 'e.g. you@company.com',
    phone: 'Phone Number',
    phonePlaceholder: 'e.g. +971 50 123 4567',
    businessType: 'Business Type',
    businessTypePlaceholder: 'Select your industry',
    interest: 'What are you interested in?',
    interestPlaceholder: 'Tell us briefly what you need...',
    submit: 'Send',
    skip: 'Maybe later',
    submitting: 'Sending...',
    thankYou: 'Thank you! 🎉',
    thankYouSub: 'Our team will reach out to you soon.',
    businessTypes: [
      { value: 'clinic', label: 'Clinic / Healthcare' },
      { value: 'salon', label: 'Salon / Spa' },
      { value: 'restaurant', label: 'Restaurant / Cafe' },
      { value: 'realestate', label: 'Real Estate' },
      { value: 'ecommerce', label: 'E-commerce' },
      { value: 'hotel', label: 'Hotel / Hospitality' },
      { value: 'agency', label: 'Marketing Agency' },
      { value: 'tech', label: 'Technology' },
      { value: 'other', label: 'Other' },
    ],
  },
  ar: {
    title: 'خلينا نتواصل! ',
    subtitle: 'اترك بياناتك وفريقنا هيتواصل معاك',
    name: 'الاسم الكامل',
    namePlaceholder: 'مثال: محمد علي',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'مثال: you@company.com',
    phone: 'رقم الهاتف',
    phonePlaceholder: 'مثال: 4567 123 50 971+',
    businessType: 'نوع النشاط التجاري',
    businessTypePlaceholder: 'اختر مجال عملك',
    interest: 'إيش يهمك تعرف؟',
    interestPlaceholder: 'قولنا باختصار إيش تحتاج...',
    submit: 'إرسال',
    skip: 'لاحقاً',
    submitting: 'جاري الإرسال...',
    thankYou: '🎉 شكراً لك!',
    thankYouSub: 'فريقنا هيتواصل معاك قريباً.',
    businessTypes: [
      { value: 'clinic', label: 'عيادة / رعاية صحية' },
      { value: 'salon', label: 'صالون / سبا' },
      { value: 'restaurant', label: 'مطعم / كافيه' },
      { value: 'realestate', label: 'عقارات' },
      { value: 'ecommerce', label: 'تجارة إلكترونية' },
      { value: 'hotel', label: 'فندق / ضيافة' },
      { value: 'agency', label: 'وكالة تسويق' },
      { value: 'tech', label: 'تقنية' },
      { value: 'other', label: 'أخرى' },
    ],
  },
};

export default function LeadForm({ sessionId, lang, onClose }: LeadFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: '',
    interest: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = labels[lang];
  const isAr = lang === 'ar';

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name && !formData.email && !formData.phone) {
      setError(isAr ? 'الرجاء إدخال بيانات التواصل' : 'Please enter at least one contact detail');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${getApiUrl()}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          name: formData.name || undefined,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          businessType: formData.businessType || undefined,
          interest: formData.interest || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed');

      setSubmitted(true);
      setTimeout(onClose, 2500);
    } catch {
      setError(isAr ? 'حصل خطأ، حاول مرة ثانية' : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30 transition-colors';

  const labelClass = 'block text-white/60 text-xs mb-1.5 font-medium';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Form Card */}
      <div
        className={`relative w-full max-w-md bg-[#0a0a1a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-purple-900/20 overflow-hidden animate-slideUp ${
          isAr ? 'text-right' : 'text-left'
        }`}
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* Gradient top accent */}
        <div className="h-1 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600" />

        <div className="p-6">
          {submitted ? (
            /* Thank You State */
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-bold text-white mb-2">{t.thankYou}</h3>
              <p className="text-white/50 text-sm">{t.thankYouSub}</p>
            </div>
          ) : (
            /* Form */
            <>
              <h3 className="text-lg font-bold text-white mb-1">{t.title}</h3>
              <p className="text-white/40 text-sm mb-5">{t.subtitle}</p>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Name */}
                <div>
                  <label className={labelClass}>{t.name}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder={t.namePlaceholder}
                    className={inputClass}
                  />
                </div>

                {/* Email + Phone Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>{t.email}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder={t.emailPlaceholder}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t.phone}</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder={t.phonePlaceholder}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Business Type Select */}
                <div>
                  <label className={labelClass}>{t.businessType}</label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => handleChange('businessType', e.target.value)}
                    className={`${inputClass} ${!formData.businessType ? 'text-white/30' : ''}`}
                  >
                    <option value="" disabled>{t.businessTypePlaceholder}</option>
                    {t.businessTypes.map((bt) => (
                      <option key={bt.value} value={bt.value} className="bg-[#0a0a1a] text-white">
                        {bt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Interest */}
                <div>
                  <label className={labelClass}>{t.interest}</label>
                  <textarea
                    value={formData.interest}
                    onChange={(e) => handleChange('interest', e.target.value)}
                    placeholder={t.interestPlaceholder}
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {/* Error */}
                {error && (
                  <p className="text-red-400 text-xs">{error}</p>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-semibold rounded-xl py-3 text-sm hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-wait"
                  >
                    {submitting ? t.submitting : t.submit}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-3 text-white/40 hover:text-white/60 text-sm rounded-xl border border-white/5 hover:border-white/10 transition-all"
                  >
                    {t.skip}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
