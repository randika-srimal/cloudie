// App-wide state, plain ChangeNotifier (no state library). Screens listen with ListenableBuilder.
import 'package:flutter/foundation.dart';

import '../api/client.dart';

enum Status { loading, ready, offline, failed }

class AppState extends ChangeNotifier {
  AppState({Api? api}) : _api = api ?? Api.instance;
  static final AppState instance = AppState();

  final Api _api;
  Status status = Status.loading;
  Hello? hello;

  Future<void> load() async {
    status = Status.loading;
    notifyListeners();
    try {
      hello = await _api.hello();
      status = Status.ready;
    } on Offline {
      status = Status.offline;
    } on ApiException {
      status = Status.failed;
    }
    notifyListeners();
  }
}
