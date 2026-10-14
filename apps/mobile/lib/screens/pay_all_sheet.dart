import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:file_selector/file_selector.dart';
import '../core/theme.dart';
import '../core/widgets.dart';
import '../shell.dart';

num _n(dynamic v) => num.tryParse('${v ?? 0}') ?? 0;
num balanceOf(Map d) => _n(d['amount_due']) - _n(d['amount_paid']);
String headOf(Map d) => d['reference_type'] == 'room_change' ? 'Room change' : d['reference_type'] == 'meter_recharge' ? 'Electricity recharge'
    : '${words(d['fee_head'])}${d['fee_head'] == 'Hostel' && d['instalment_no'] != null ? ', part ${d['instalment_no']}' : ''}';

/// Pay all: every open demand at once. Three ways, as the hostel accepts them: a receipt from the university payment
/// portal (the PDF receipt, checked by the Floor Manager and approved by the Chief Manager), the wallet, or the online gateway.
/// With no [demands] it adds money to the wallet with a receipt. [onDone] reloads the page underneath.
void showPayAllSheet(BuildContext context, {required List<Map> demands, required VoidCallback onDone, num walletBalance = 0}) {
  final total = demands.fold<num>(0, (a, d) => a + balanceOf(d));
  final addMoney = demands.isEmpty;
  String mode = addMoney ? 'receipt' : '';
  final amount = TextEditingController(text: addMoney ? '' : total.round().toString()), ref = TextEditingController();
  DateTime paidOn = DateTime.now();
  String? photo; // data URL of the PDF receipt (the field keeps its old name)
  String? fileName;
  var busy = false, done = false; String doneTitle = '', doneBody = '', error = '';

  Future<void> pickPdf(StateSetter set) async {
    try {
      const pdf = XTypeGroup(label: 'PDF', extensions: ['pdf'], mimeTypes: ['application/pdf'], uniformTypeIdentifiers: ['com.adobe.pdf']);
      final f = await openFile(acceptedTypeGroups: [pdf]);
      if (f == null) return;
      final url = 'data:application/pdf;base64,${base64Encode(await f.readAsBytes())}';
      if (url.length > 1400000) { if (context.mounted) toast(context, 'That PDF is too large (over 1 MB). Download a smaller copy from the portal.', error: true); return; }
      set(() { photo = url; fileName = f.name; });
    } catch (e) {
      if (context.mounted) toast(context, 'Could not open the file: $e', error: true);
    }
  }


  showKSheet(context, mod: Mod.amber, icon: LucideIcons.wallet, title: addMoney ? 'Add money to the wallet' : 'Pay all · ${inr(total)}',
      sub: addMoney ? 'Pay on the university portal and upload the receipt' : '${demands.length} fee${demands.length == 1 ? '' : 's'} in one payment',
      body: (ctx, set) {
        if (done) return DoneView(title: doneTitle, body: doneBody, onClose: () => Navigator.pop(ctx));
        if (mode == '') {
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Lines([for (final d in demands) LineItem(headOf(d), sub: 'Due ${day(d['due_date'])}', trailing: Text(inr(balanceOf(d)), style: const TextStyle(fontWeight: FontWeight.w800)))]),
            const SizedBox(height: 16),
            const KLabel('How did you pay, or how will you?'),
            _Way(LucideIcons.receiptIndianRupee, 'I paid on the university portal', 'Upload the PDF receipt from the portal. The Floor Manager checks it and the Chief Manager approves it.', () => set(() => mode = 'receipt')),
            _Way(LucideIcons.wallet, 'Pay from my wallet', walletBalance >= total ? 'The wallet holds ${inr(walletBalance)}; ${inr(total)} is taken at once.' : 'The wallet holds ${inr(walletBalance)}; add money first.',
                walletBalance >= total ? () => set(() => mode = 'wallet') : null),
            _Way(LucideIcons.creditCard, 'Pay online now', 'UPI, card or net banking through the university gateway.', () => set(() => mode = 'online')),
          ]);
        }
        if (mode == 'wallet') {
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Facts([('From the wallet', inr(walletBalance), LucideIcons.wallet), ('To pay', inr(total), LucideIcons.receipt), ('Left in the wallet', inr(walletBalance - total), LucideIcons.piggyBank)]),
            const Note('The receipts are issued at once and your fees show as paid.'),
          ]);
        }
        if (mode == 'online') {
          return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Facts([('To pay', inr(total), LucideIcons.creditCard)]),
            const Note('Each fee is paid through the gateway in turn; a receipt is issued for each.'),
          ]);
        }
        // the receipt
        return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const KLabel('The receipt: the PDF downloaded from the university payment portal'),
          if (photo != null && fileName == null) ClipRRect(borderRadius: BorderRadius.circular(14), child: Image.memory(base64Decode(photo!.split(',').last), height: 220, fit: BoxFit.cover, width: double.infinity)),
          if (photo != null && fileName != null) Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: K.brandTint, borderRadius: BorderRadius.circular(14)),
              child: Row(children: [const Icon(LucideIcons.fileText, color: K.brand), const SizedBox(width: 10), Expanded(child: Text(fileName!, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)))])),
          if (photo != null) const SizedBox(height: 8),
          KButton(photo == null ? 'Choose the PDF receipt' : 'Choose another PDF', icon: LucideIcons.fileText, kind: BtnKind.secondary, block: true, onPressed: () => pickPdf(set)),
          const SizedBox(height: 6),
          const Text('Photos are not accepted: the PDF carries the portal\'s own text, which the system reads and matches.', style: TextStyle(fontSize: 12, color: K.ink3)),
          const SizedBox(height: 16),
          const KLabel('Amount paid (₹)'),
          TextField(controller: amount, keyboardType: TextInputType.number, onChanged: (_) => set(() {}), decoration: const InputDecoration(hintText: 'As on the receipt')),
          const SizedBox(height: 14),
          const KLabel('Transaction or receipt number'),
          TextField(controller: ref, decoration: const InputDecoration(hintText: 'From the portal, if shown'), textCapitalization: TextCapitalization.characters),
          const SizedBox(height: 14),
          const KLabel('Paid on'),
          InkWell(onTap: () async { final d = await showDatePicker(context: ctx, initialDate: paidOn, firstDate: DateTime.now().subtract(const Duration(days: 60)), lastDate: DateTime.now()); if (d != null) set(() => paidOn = d); },
              borderRadius: BorderRadius.circular(12),
              child: Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12), decoration: BoxDecoration(border: Border.all(color: K.line), borderRadius: BorderRadius.circular(12)),
                  child: Row(children: [Expanded(child: Text(day(isoDay(paidOn)))), const Icon(LucideIcons.calendar, size: 16, color: K.ink3)]))),
          const SizedBox(height: 14),
          Note(addMoney ? 'The system reads the receipt and the wardens approve it; then the amount is added to your wallet.' : 'The system reads the receipt and matches the amount, date and your ID; the wardens then approve it. Anything paid beyond these fees goes to your wallet.'),
        ]);
      },
      footer: (ctx, set) {
        if (done) return const SizedBox.shrink();
        Future<void> run(Future<void> Function() f, String title, String body) async {
          set(() { busy = true; error = ''; });
          try { await f(); onDone(); set(() { done = true; doneTitle = title; doneBody = body; }); }
          // the refusal is shown inside the sheet: a snack bar would be hidden under it
          catch (e) { if (ctx.mounted) set(() => error = e.toString().replaceFirst(RegExp(r'^\w+: '), '')); }
          finally { if (ctx.mounted) set(() => busy = false); }
        }
        if (mode == '') return const SizedBox.shrink();
        final ids = [for (final d in demands) d['demand_id']];
        if (mode == 'wallet') {
          return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [if (error.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 8), child: _ErrorNote(error)), KButton('Pay ${inr(total)} from the wallet', block: true, busy: busy, onPressed: () => run(() => api.post('/me/wallet/pay', {'demand_ids': ids}), 'Paid from the wallet', '${inr(total)} is paid and the receipts are under Fees.'))]);
        }
        if (mode == 'online') {
          return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [if (error.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 8), child: _ErrorNote(error)), KButton('Pay ${inr(total)} online', block: true, busy: busy, onPressed: () => run(() async {
            for (final d in demands) {
              final order = await api.post('/payments/orders', {'demand_id': d['demand_id']});
              if (order is Map && order['mode'] == 'dev') { await api.post('/payments/dev-confirm', {'demand_id': d['demand_id'], 'amount': balanceOf(d)}); }
            }
          }, 'Paid online', '${inr(total)} is paid and the receipts are under Fees.'))]);
        }
        final amt = num.tryParse(amount.text.trim()) ?? 0;
        final blocked = photo == null ? 'Attach the PDF receipt.' : amt <= 0 ? 'Enter the amount paid.' : null;
        return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          if (error.isNotEmpty) Padding(padding: const EdgeInsets.only(bottom: 8), child: _ErrorNote(error)),
          KButton('Send the receipt', icon: LucideIcons.send, block: true, busy: busy, onPressed: blocked != null ? null : () => run(
              () => api.post('/me/payment-proofs', {'demand_ids': ids, 'amount': amt, 'paid_on': isoDay(paidOn), 'reference': ref.text.trim().isEmpty ? null : ref.text.trim(), 'photo': photo}),
              'Receipt sent', 'Your Floor Manager checks it, then the Chief Manager approves it. You get a message at each step.')),
          if (blocked != null) Padding(padding: const EdgeInsets.only(top: 6), child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(LucideIcons.lock, size: 13, color: K.ink3), const SizedBox(width: 5), Text(blocked, style: const TextStyle(fontSize: 12, color: K.ink3))])),
        ]);
      });
}

/// What the server refused and why, in red, right above the button.
class _ErrorNote extends StatelessWidget {
  final String text;
  const _ErrorNote(this.text);
  @override
  Widget build(BuildContext context) => Container(width: double.infinity, padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 9),
      decoration: BoxDecoration(color: const Color(0xFFFDECEC), borderRadius: BorderRadius.circular(10)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [const Icon(LucideIcons.circleAlert, size: 16, color: K.bad), const SizedBox(width: 8),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 13, color: K.bad, fontWeight: FontWeight.w600)))]));
}

class _Way extends StatelessWidget {
  final IconData icon;
  final String title, sub;
  final VoidCallback? onTap;
  const _Way(this.icon, this.title, this.sub, this.onTap);
  @override
  Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 10), child: Opacity(opacity: onTap == null ? .55 : 1, child: Material(color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: K.line, width: 1.5)),
      child: InkWell(onTap: onTap, borderRadius: BorderRadius.circular(14), child: Padding(padding: const EdgeInsets.all(12), child: Row(children: [
        Container(width: 38, height: 38, decoration: BoxDecoration(color: K.brandTint, borderRadius: BorderRadius.circular(11)), child: Icon(icon, size: 18, color: K.brand)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontSize: 14.5, fontWeight: FontWeight.w700)),
          const SizedBox(height: 2),
          Text(sub, style: const TextStyle(fontSize: 12.5, height: 1.35, color: K.ink2)),
        ])),
        const SizedBox(width: 6),
        const Icon(LucideIcons.chevronRight, size: 18, color: K.ink3),
      ]))))));
}

/// The wallet on the Fees page: what the hostel holds for the student, and the last few movements.
class WalletCard extends StatelessWidget {
  final Map? wallet;
  final VoidCallback onAddMoney;
  const WalletCard({super.key, required this.wallet, required this.onAddMoney});
  @override
  Widget build(BuildContext context) {
    final bal = _n(wallet?['balance']);
    final txns = ((wallet?['txns'] as List?) ?? []).cast<Map>().take(4).toList();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(18), gradient: const LinearGradient(colors: [Color(0xFF0E8F84), Color(0xFF0A5F6E)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          boxShadow: const [BoxShadow(color: Color(0x400B7A71), blurRadius: 24, spreadRadius: -8, offset: Offset(0, 12))]),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          const Icon(LucideIcons.wallet, size: 18, color: Colors.white), const SizedBox(width: 8),
          const Expanded(child: Text('My wallet', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white))),
          Material(color: const Color(0x33FFFFFF), borderRadius: BorderRadius.circular(999), child: InkWell(onTap: onAddMoney, borderRadius: BorderRadius.circular(999),
              child: const Padding(padding: EdgeInsets.symmetric(horizontal: 12, vertical: 6), child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(LucideIcons.plus, size: 14, color: Colors.white), SizedBox(width: 4), Text('Add money', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Colors.white))])))),
        ]),
        const SizedBox(height: 10),
        Text(inr(bal), style: const TextStyle(fontSize: 32, height: 1.1, fontWeight: FontWeight.w800, letterSpacing: -1, color: Colors.white, fontFeatures: [FontFeature.tabularFigures()])),
        const SizedBox(height: 2),
        const Text('Money the hostel holds for you. Pay any fee from it at once.', style: TextStyle(fontSize: 12.5, color: Color(0xD9FFFFFF))),
        if (txns.isNotEmpty) ...[
          const SizedBox(height: 12),
          for (final t in txns) Padding(padding: const EdgeInsets.only(top: 6), child: Row(children: [
            Icon(t['kind'] == 'Credit' ? LucideIcons.arrowDownLeft : LucideIcons.arrowUpRight, size: 14, color: const Color(0xD9FFFFFF)), const SizedBox(width: 6),
            Expanded(child: Text('${t['reason']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5, color: Color(0xD9FFFFFF)))),
            Text('${t['kind'] == 'Credit' ? '+' : '−'}${inr(t['amount'])}', style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white, fontFeatures: [FontFeature.tabularFigures()])),
          ])),
        ],
      ]),
    );
  }
}

/// Receipts the student uploaded, each with where it stands.
class ProofsList extends StatelessWidget {
  final List<Map> proofs;
  const ProofsList({super.key, required this.proofs});
  static const _state = {'Uploaded': ('With the Floor Manager', Tone.warn), 'Checked': ('With the Chief Manager', Tone.progress), 'Approved': ('Approved', Tone.good), 'Rejected': ('Not accepted', Tone.bad)};
  static const _ocr = {'Pending': ('Being read', Tone.muted), 'Matched': ('Receipt matches', Tone.good), 'Mismatch': ('Does not match', Tone.bad), 'Unreadable': ('Could not be read', Tone.warn)};
  @override
  Widget build(BuildContext context) => Lines([
        for (final p in proofs) () {
          final (label, tone) = _state[p['status']] ?? ('${p['status']}', Tone.muted);
          final photo = '${p['photo'] ?? ''}';
          final pdf = '${p['mime'] ?? ''}' == 'application/pdf' || photo.startsWith('data:application/pdf');
          final (olabel, otone) = _ocr[p['ocr_status']] ?? ('', Tone.muted);
          final bad = ((p['ocr_checks'] as List?) ?? []).cast<Map>().where((c) => c['ok'] == false).map((c) => c['check']).join(', ');
          return LineItem('${p['proof_no'] ?? 'Receipt'} · ${inr(p['amount'])}',
              sub: '${day(p['paid_on'])}${p['reference'] != null ? ' · ${p['reference']}' : ''}${olabel.isNotEmpty ? '\nSystem check: $olabel${bad.isNotEmpty ? ' ($bad)' : ''}' : ''}${p['status'] == 'Rejected' && p['remarks'] != null ? '\n${p['remarks']}' : ''}',
              leading: pdf ? const Icon(LucideIcons.fileText, color: K.brand) : photo.startsWith('data:') ? ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(base64Decode(photo.split(',').last), width: 44, height: 44, fit: BoxFit.cover)) : const Icon(LucideIcons.receipt, color: K.ink3),
              trailing: Column(crossAxisAlignment: CrossAxisAlignment.end, mainAxisSize: MainAxisSize.min, children: [Pill(label, tone: tone), if (olabel.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Pill(olabel, tone: otone))]),
              onTap: !pdf && photo.startsWith('data:') ? () => showDialog<void>(context: context, builder: (c) => Dialog(insetPadding: const EdgeInsets.all(16), child: InteractiveViewer(child: Image.memory(base64Decode(photo.split(',').last))))) : null);
        }(),
      ]);
}
