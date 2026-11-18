// The hello-world screen: the same greeting as the website, from GET /api/hello.
import 'package:material_ui/material_ui.dart';

import '../../config.dart';
import '../../state/app_state.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key, this.state});

  /// Injected in tests; the app uses the shared instance.
  final AppState? state;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late final AppState app = widget.state ?? AppState.instance;

  @override
  void initState() {
    super.initState();
    app.load();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: app.load,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 80),
              Text('Hello, world', style: theme.textTheme.displayMedium?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 24),
              ListenableBuilder(
                listenable: app,
                builder: (context, _) => Text(
                  switch (app.status) {
                    Status.loading => 'Asking the API…',
                    Status.ready => '${app.hello!.message} from the API at ${app.hello!.colo}',
                    Status.offline => 'No connection to $apiOrigin. Pull to retry.',
                    Status.failed => 'The API answered with an error. Pull to retry.',
                  },
                  key: const Key('api-message'),
                  style: theme.textTheme.bodyLarge,
                ),
              ),
              if (buildLabel.isNotEmpty) ...[
                const SizedBox(height: 48),
                Text('$buildLabel · $apiOrigin', style: theme.textTheme.bodySmall),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
