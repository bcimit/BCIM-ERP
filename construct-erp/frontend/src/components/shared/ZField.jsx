import React from 'react';
import { Z_LABEL } from '../../constants/zohoStyles';

// Zoho-style label-above-field wrapper used by the redesigned create/edit forms.
export default function ZField({ label, children, className }) {
  return (
    <div className={`space-y-1 ${className || ''}`}>
      <label className={Z_LABEL}>{label}</label>
      {children}
    </div>
  );
}
