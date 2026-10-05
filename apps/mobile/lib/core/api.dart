import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';
import 'session.dart';

/// What went wrong, in the API's own words (it names the rule that was broken).
class ApiError implements Exception {
  final int status;
  final String message;
  ApiError(this.status, this.message);
  @override
  String toString() => message;
}

/// The hostel API, called as the signed-in student. With university sign-in it sends the access token; with demo
/// sign-in it names the student the way the web app does in development.
class Api {
  static final Api instance = Api._();
  Api._();
  final _client = http.Client();

  Map<String, String> _headers() {
    final s = SessionStore.instance.current;
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (s?.token != null) 'Authorization': 'Bearer ${s!.token}',
      if (s != null && s.token == null) ...{'x-dev-user': s.id, 'x-dev-role': s.role},
    };
  }

  Uri _uri(String path) => Uri.parse('${Config.apiBase}/api$path');

  Future<dynamic> get(String path) => _send(() => _client.get(_uri(path), headers: _headers()));
  Future<dynamic> post(String path, [Object? body]) => _send(() => _client.post(_uri(path), headers: _headers(), body: jsonEncode(body ?? {})));
  Future<dynamic> put(String path, [Object? body]) => _send(() => _client.put(_uri(path), headers: _headers(), body: jsonEncode(body ?? {})));
  Future<dynamic> delete(String path) => _send(() => _client.delete(_uri(path), headers: _headers()));

  Future<dynamic> _send(Future<http.Response> Function() call) async {
    http.Response r;
    try {
      r = await call().timeout(const Duration(seconds: 20));
    } catch (_) {
      throw ApiError(0, 'Cannot reach the hostel server. Check your internet connection.');
    }
    final text = utf8.decode(r.bodyBytes);
    final body = text.isEmpty ? null : _tryJson(text);
    if (r.statusCode >= 200 && r.statusCode < 300) return body;
    if (r.statusCode == 401) await SessionStore.instance.signOut();
    final msg = body is Map && body['message'] != null
        ? (body['message'] is List ? (body['message'] as List).join(', ') : body['message'].toString())
        : 'Something went wrong (${r.statusCode})';
    throw ApiError(r.statusCode, msg);
  }

  dynamic _tryJson(String t) {
    try {
      return jsonDecode(t);
    } catch (_) {
      return t;
    }
  }
}
