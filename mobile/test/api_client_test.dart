import 'dart:convert';

import 'package:cloudie/api/client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('hello parses the API reply', () async {
    final api = Api(
      client: MockClient((req) async {
        expect(req.url.path, '/api/hello');
        return http.Response(
          jsonEncode({'message': 'Hello, world!', 'colo': 'SIN', 'at': '2026-01-01T00:00:00.000Z'}),
          200,
        );
      }),
    );
    final hello = await api.hello();
    expect(hello.message, 'Hello, world!');
    expect(hello.colo, 'SIN');
  });

  test('an error reply becomes ApiException', () async {
    final api = Api(client: MockClient((_) async => http.Response('{"error":"nope"}', 500)));
    expect(api.hello(), throwsA(isA<ApiException>()));
  });

  test('a network failure becomes Offline', () async {
    final api = Api(client: MockClient((_) async => throw http.ClientException('down')));
    expect(api.hello(), throwsA(isA<Offline>()));
  });
}
