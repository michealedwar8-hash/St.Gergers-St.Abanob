import React from 'react';
import { Phone } from 'lucide-react';
import { getPhoneLinks } from '../utils/helpers';

interface PhoneActionsProps {
  phone: string;
  notes?: string;
  whatsappMessage?: string;
  whatsappLabel?: string;
  showText?: boolean;
}

/** Official WhatsApp brand emblem SVG */
export const WhatsAppOfficialIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 32 32"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path d="M16.002 3C8.832 3 3 8.832 3 16.002c0 2.29.598 4.527 1.734 6.5L3 29l6.678-1.752A12.94 12.94 0 0 0 16.002 29C23.17 29 29 23.17 29 16.002 29 8.832 23.17 3 16.002 3zm0 23.62c-2.01 0-3.982-.54-5.702-1.56l-.41-.243-3.963 1.04 1.058-3.864-.267-.424a10.56 10.56 0 0 1-1.622-5.567c0-5.844 4.756-10.6 10.606-10.6 2.833 0 5.495 1.104 7.498 3.108a10.535 10.535 0 0 1 3.106 7.492c0 5.845-4.757 10.618-10.304 10.618zm5.815-7.943c-.318-.16-1.884-.93-2.176-1.036-.292-.106-.504-.16-.716.16-.212.318-.822 1.035-1.008 1.248-.186.212-.372.238-.69.08-.318-.16-1.344-.496-2.56-1.58-.946-.844-1.585-1.887-1.77-2.205-.186-.318-.02-.49.14-.649.143-.142.318-.372.478-.558.159-.186.212-.318.318-.53.106-.212.053-.398-.026-.558-.08-.16-.716-1.726-.982-2.363-.258-.62-.52-.536-.716-.546l-.61-.01c-.212 0-.557.08-.85.398-.292.318-1.114 1.088-1.114 2.654s1.14 3.08 1.3 3.292c.159.212 2.244 3.428 5.437 4.806.76.328 1.353.524 1.815.67.763.243 1.457.209 2.006.127.612-.091 1.884-.77 2.15-1.514.265-.743.265-1.38.186-1.513-.08-.133-.292-.212-.61-.372z" />
  </svg>
);

export const PhoneActions: React.FC<PhoneActionsProps> = ({
  phone,
  notes = '',
  whatsappMessage,
  whatsappLabel,
  showText = false,
}) => {
  const { hasValidPhone, hasWhatsApp, telHref, whatsappHref } = getPhoneLinks(
    phone,
    notes,
    whatsappMessage
  );

  if (!hasValidPhone) {
    return (
      <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
        لا يوجد رقم
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 shrink-0">
      <a
        href={telHref}
        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors whitespace-nowrap"
        title="اتصال هاتفي مباشر"
        aria-label="اتصال هاتفي مباشر"
      >
        <Phone className="w-3.5 h-3.5 shrink-0" />
        {showText && <span>اتصال</span>}
      </a>
      {hasWhatsApp && (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1DA851] text-white font-bold text-xs shadow-xs transition-colors whitespace-nowrap"
          title={whatsappLabel || 'محادثة عبر واتساب'}
          aria-label={whatsappLabel || 'محادثة عبر واتساب'}
        >
          <WhatsAppOfficialIcon className="w-4 h-4 shrink-0" />
          {(showText || whatsappLabel) && <span>{whatsappLabel || 'واتساب'}</span>}
        </a>
      )}
    </div>
  );
};
