import { useCallback, useEffect, useRef, useState } from 'react';
import DonationPopupModal from './DonationPopupModal';
import { mergeDonationPopup } from '../lib/siteModalDefaults';

const SSN_CLICKS = 'scraptor_donation_click_cnt';
const SSN_SHOWN = 'scraptor_donation_popup_shown';

/** Tracks document clicks (session) and opens donation modal once threshold is reached. */
export default function DonationPopupHost({
  donationRaw,
  activeTab,
  termsAccepted,
  maintenanceBlocksPublic,
}) {
  const cfg = mergeDonationPopup(donationRaw);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);

  const allowTrack =
    cfg.enabled &&
    termsAccepted &&
    !maintenanceBlocksPublic &&
    activeTab !== 'admin';

  const handleClose = useCallback(() => {
    setOpen(false);
    openRef.current = false;
    try {
      sessionStorage.setItem(SSN_SHOWN, '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!allowTrack) return undefined;

    const onClick = () => {
      if (openRef.current) return;
      try {
        if (sessionStorage.getItem(SSN_SHOWN) === '1') return;
      } catch {
        return;
      }
      let n = 0;
      try {
        n = parseInt(sessionStorage.getItem(SSN_CLICKS) || '0', 10);
      } catch {
        n = 0;
      }
      if (!Number.isFinite(n)) n = 0;
      n += 1;
      try {
        sessionStorage.setItem(SSN_CLICKS, String(n));
      } catch {
        /* ignore */
      }
      if (n >= cfg.clickThreshold) {
        try {
          sessionStorage.setItem(SSN_SHOWN, '1');
        } catch {
          /* ignore */
        }
        openRef.current = true;
        setOpen(true);
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [allowTrack, cfg.clickThreshold]);

  if (!cfg.enabled) return null;

  return (
    <DonationPopupModal
      open={open}
      onClose={handleClose}
      title={cfg.title}
      body={cfg.body}
      imageUrl={cfg.imageUrl}
      closeDelayEnabled={cfg.closeDelayEnabled}
      closeDelaySeconds={cfg.closeDelaySeconds}
      closeLabel={cfg.closeLabel}
      paypalEnabled={cfg.paypalEnabled}
      paypalUrl={cfg.paypalUrl}
      paypalLabel={cfg.paypalLabel}
    />
  );
}
