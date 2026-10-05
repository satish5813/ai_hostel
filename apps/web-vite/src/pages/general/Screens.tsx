import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Card, FilterChip, Notice, StatusChip, Tabs } from '@/lib/klh';
import { ACCESS_LABEL, MODULE, ROLES, RULES, SCREENS, roleDef, type Workflow } from '@/app/screens';
import { AccessChips, useSession } from '@/lib/ui';

/** The screen map: the 87 screens and 27 roles of the Roles document, which of them are in this release, and the master matrix. */
export default function ScreenMap() {
  const s = useSession();
  const navigate = useNavigate();
  const [tab, setTab] = useState('mine');
  const [wf, setWf] = useState<Workflow | ''>('');
  const def = s ? roleDef(s.role) : undefined;
  const built = SCREENS.filter((x) => x.route).length;
  const workflows = [...new Set(SCREENS.map((x) => x.workflow))];
  const rows = SCREENS.filter((x) => !wf || x.workflow === wf);
  return (
    <div className="klh-stack" style={{ gap: 24 }}>
      <div><h1 style={{ fontSize: 26, lineHeight: '34px', fontWeight: 700, margin: 0 }}>Screen map</h1><p className="klh-muted" style={{ margin: '4px 0 0' }}>{SCREENS.filter((x) => !x.extra).length} screens and {ROLES.length} roles from "Roles, Screens and Access Rights" (1 Oct 2026). {built} screens are in this release (Workflows A–F, general, one report and admin); the rest wait for the Workflow G–N pages. Two screens are additions for this release: ADM-04 Masters and TRK-07 Attendance register.</p></div>
      <Tabs label="Screen map" tabs={[{ id: 'mine', label: def ? `My screens (${def.code})` : 'My screens' }, { id: 'all', label: 'All screens', count: SCREENS.length }, { id: 'matrix', label: 'Master matrix' }, { id: 'rules', label: 'Rules for every role' }]} value={tab} onChange={setTab} />

      {tab === 'mine' && def && (
        <div className="klh-stack" style={{ gap: 16 }}>
          <Notice tone="info" title={`${def.code} · ${def.name}`}>Scope: {def.scope}. Used on: {def.device}. {Object.keys(def.access).length} screens.</Notice>
          <Card padding={0}>
            <table className="klh-table"><thead><tr><th>Screen</th><th>What it is for</th><th>Workflow</th><th>Access</th><th>Release</th></tr></thead>
              <tbody>{SCREENS.filter((x) => def.access[x.code]).map((x) => <tr key={x.code} style={{ cursor: x.route && !x.route.includes(':') ? 'pointer' : undefined }} onClick={() => x.route && !x.route.includes(':') && navigate(x.route)}>
                <td><span className="klh-code">{x.code}</span> {x.name}</td><td className="klh-muted">{x.purpose}</td><td>{MODULE[x.workflow].label}</td><td><AccessChips access={def.access[x.code]} /></td><td>{x.route ? <StatusChip status="Active" label="In this release" /> : <StatusChip status="Pending" label="Next release" />}</td></tr>)}</tbody></table>
          </Card>
          <Card icon="shield" color="brand" title="Cannot"><ul style={{ margin: 0, paddingLeft: 20 }}>{def.cannot.map((c) => <li key={c}>{c}</li>)}</ul></Card>
        </div>)}

      {tab === 'all' && (
        <Card padding={0}>
          <div className="klh-row" style={{ padding: 16, flexWrap: 'wrap' }}><FilterChip label="All" count={SCREENS.length} selected={!wf} onClick={() => setWf('')} />{workflows.map((w) => <FilterChip key={w} label={MODULE[w].label} count={SCREENS.filter((x) => x.workflow === w).length} selected={wf === w} onClick={() => setWf(wf === w ? '' : w)} />)}</div>
          <table className="klh-table"><thead><tr><th>Code</th><th>Screen</th><th>What it is for</th><th>Workflow</th><th>Route</th></tr></thead>
            <tbody>{rows.map((x) => <tr key={x.code}><td className="klh-code">{x.code}</td><td>{x.name}</td><td className="klh-muted">{x.purpose}</td><td>{MODULE[x.workflow].label}</td><td>{x.route ? <span className="klh-code">{x.route}</span> : <StatusChip status="Pending" label="Next release" />}</td></tr>)}</tbody></table>
        </Card>)}

      {tab === 'matrix' && (
        <Card padding={0}>
          <p className="klh-muted" style={{ padding: '12px 16px 0', margin: 0 }}>V view · C create · E edit · A approve or reject · X set up · blank = no access. GEN-01 and GEN-02 are open to everyone.</p>
          <div style={{ overflowX: 'auto' }}>
            <table className="klh-table" style={{ fontSize: 12 }}><thead><tr><th style={{ position: 'sticky', left: 0, background: 'var(--surface-2)' }}>Screen</th>{ROLES.map((r) => <th key={r.code} title={r.name}>{r.code}</th>)}</tr></thead>
              <tbody>{SCREENS.filter((x) => !['GEN-01', 'GEN-02'].includes(x.code)).map((x) => <tr key={x.code}><td style={{ position: 'sticky', left: 0, background: 'var(--surface-1)', whiteSpace: 'nowrap' }}><span className="klh-code">{x.code}</span> {x.name}</td>{ROLES.map((r) => <td key={r.code} className="klh-code" style={{ textAlign: 'center' }} title={r.access[x.code]?.split('').map((a) => ACCESS_LABEL[a]).join(', ')}>{r.access[x.code] ?? ''}</td>)}</tr>)}</tbody></table>
          </div>
        </Card>)}

      {tab === 'rules' && (
        <Card padding={0}><table className="klh-table"><thead><tr><th>Rule</th><th>What the software does</th></tr></thead><tbody>{RULES.map((r) => <tr key={r.rule}><td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.rule}</td><td>{r.does}</td></tr>)}</tbody></table></Card>)}
    </div>
  );
}
