'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Motorcycle } from '@/lib/types';
import ShareHistoryModal from './ShareHistoryModal';
import { ui } from './ui';

/** Opens Share service history from the owner's printable page. */
export default function ShareButton({ bike }: { bike: Motorcycle }) {
  const [supabase] = useState(createClient);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={ui.secondaryButton}>
        <Link2 size={16} />
        Share link
      </button>
      {isOpen && <ShareHistoryModal supabase={supabase} bike={bike} onClose={() => setIsOpen(false)} />}
    </>
  );
}
