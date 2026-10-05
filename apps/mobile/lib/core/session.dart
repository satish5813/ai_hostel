import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The signed-in student, kept in the phone's secure storage so the app opens signed in.
class Session {
  final String id;
  final String role;
  final String name;
  final String? token; // university sign-in (OIDC) access token; null with demo sign-in
  const Session({required this.id, required this.role, required this.name, this.token});

  Map<String, dynamic> toJson() => {'id': id, 'role': role, 'name': name, 'token': token};
  factory Session.fromJson(Map<String, dynamic> j) => Session(id: j['id'], role: j['role'], name: j['name'] ?? '', token: j['token']);
}

class SessionStore extends ChangeNotifier {
  static final SessionStore instance = SessionStore._();
  SessionStore._();
  static const _key = 'klu.session';
  final _storage = const FlutterSecureStorage();
  Session? current;
  bool loaded = false;

  Future<void> load() async {
    try {
      final raw = await _storage.read(key: _key);
      if (raw != null) current = Session.fromJson(jsonDecode(raw));
    } catch (_) {
      current = null;
    }
    loaded = true;
    notifyListeners();
  }

  Future<void> signIn(Session s) async {
    current = s;
    await _storage.write(key: _key, value: jsonEncode(s.toJson()));
    notifyListeners();
  }

  Future<void> signOut() async {
    current = null;
    await _storage.delete(key: _key);
    notifyListeners();
  }
}
