import { useState, type ReactNode } from 'react';
import { DoorOpen } from 'lucide-react';
import { useApi } from '@/lib/ui';
import { LIVE_PASS, OutingSheet, PENDING_PASS, type Pass } from './OutingSheet';

/**
 * Ask for outing permission from any student page: the request form opens over the page, and an outing already open
 * (a pass or a request in approval) shows in it with its own Show pass / Cancel.
 */
export function useOuting(onChange?: () => void) {
  const passes = useApi<Pass[]>('/outpasses/mine');
  const [mode, setMode] = useState<'ask' | 'outing' | null>(null);
  const live = passes.data?.find((o) => LIVE_PASS.includes(o.status));
  const pending = passes.data?.find((o) => PENDING_PASS.includes(o.status));
  const sheet: ReactNode = mode && (
    <OutingSheet ask={mode === 'ask'} live={live} pending={pending} onClose={() => setMode(null)} onDone={() => { passes.mutate(); onChange?.(); }} onShow={() => setMode('outing')} />
  );
  return { passes, live, pending, ask: () => setMode('ask'), show: () => setMode('outing'), sheet };
}

/** The floating Ask for outing button of the student frame (pages without their own button). */
export function OutingFab() {
  const o = useOuting();
  return (
    <>
      <button type="button" className="st-fab" onClick={o.live || o.pending ? o.show : o.ask} aria-label={o.live ? 'Show my gate pass' : o.pending ? 'Outing request status' : 'Ask for outing permission'}>
        <DoorOpen size={18} /><span>{o.live ? 'My gate pass' : o.pending ? 'Outing status' : 'Ask for outing'}</span>
      </button>
      {o.sheet}
    </>
  );
}
