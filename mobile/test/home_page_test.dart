import 'dart:convert';

import 'package:cloudie/api/client.dart';
import 'package:cloudie/features/home/home_page.dart';
import 'package:cloudie/state/app_state.dart';
import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets('shows the greeting from the API', (tester) async {
    final api = Api(
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({'message': 'Hello, world!', 'colo': 'SIN', 'at': '2026-01-01T00:00:00.000Z'}),
          200,
        ),
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        home: HomePage(state: AppState(api: api)),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Hello, world'), findsOneWidget);
    expect(find.text('Hello, world! from the API at SIN'), findsOneWidget);
  });
}
