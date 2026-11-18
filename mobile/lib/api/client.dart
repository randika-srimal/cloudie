// The API client: JSON over HTTP to the Pages Functions in backend/api/functions. The reply shapes
// mirror the Zod schemas in shared/protocol/src/index.ts; keep the two in step.
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../config.dart';

/// The phone could not reach the server at all (offline, DNS, timeout).
class Offline implements Exception {
  const Offline([this.cause]);
  final Object? cause;
  @override
  String toString() => 'Offline($cause)';
}

/// The server answered with an error: `{ "error": "..." }` and a 4xx/5xx status.
class ApiException implements Exception {
  const ApiException(this.status, this.message);
  final int status;
  final String message;
  @override
  String toString() => 'ApiException($status, $message)';
}

/// GET /api/hello
class Hello {
  const Hello({required this.message, required this.colo, required this.at});
  final String message;
  final String colo;
  final DateTime at;

  factory Hello.fromJson(Map<String, dynamic> json) =>
      Hello(message: json['message'] as String, colo: json['colo'] as String, at: DateTime.parse(json['at'] as String));
}

class Api {
  Api({http.Client? client}) : _http = client ?? http.Client();

  static final Api instance = Api();
  final http.Client _http;

  Future<Map<String, dynamic>> getJson(String path, {Duration timeout = const Duration(seconds: 15)}) async {
    final http.Response res;
    try {
      res = await _http
          .get(apiUri(path), headers: {'Accept': 'application/json', 'X-Client': clientName})
          .timeout(timeout);
    } on SocketException catch (e) {
      throw Offline(e);
    } on TimeoutException catch (e) {
      throw Offline(e);
    } on http.ClientException catch (e) {
      throw Offline(e);
    }

    Map<String, dynamic> body;
    try {
      body = jsonDecode(res.body) as Map<String, dynamic>;
    } on FormatException {
      body = {'error': res.body};
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw ApiException(res.statusCode, body['error']?.toString() ?? 'HTTP ${res.statusCode}');
    }
    return body;
  }

  Future<Hello> hello() async => Hello.fromJson(await getJson('/api/hello'));

  /// GET /api/health: true when the backend answers.
  Future<bool> health() async => (await getJson('/api/health'))['ok'] == true;
}
