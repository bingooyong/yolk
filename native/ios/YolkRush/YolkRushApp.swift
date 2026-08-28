import SwiftUI
import WebKit
import UniformTypeIdentifiers

@main
struct YolkRushApp: App {
  var body: some Scene {
    WindowGroup {
      GameView()
        .ignoresSafeArea()
        .statusBarHidden(true)
        .persistentSystemOverlays(.hidden)
    }
  }
}

struct GameView: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> GameViewController {
    GameViewController()
  }

  func updateUIViewController(_ uiViewController: GameViewController, context: Context) {}
}

final class GameViewController: UIViewController, WKURLSchemeHandler {
  private var webView: WKWebView!

  override var prefersStatusBarHidden: Bool { true }
  override var prefersHomeIndicatorAutoHidden: Bool { true }
  override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .all }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 23 / 255, green: 20 / 255, blue: 28 / 255, alpha: 1)

    let config = WKWebViewConfiguration()
    config.setURLSchemeHandler(self, forURLScheme: "yolkrush")
    config.allowsInlineMediaPlayback = true
    config.mediaTypesRequiringUserActionForPlayback = []
    config.suppressesIncrementalRendering = false
    config.defaultWebpagePreferences.allowsContentJavaScript = true
    if #available(iOS 15.0, *) {
      config.defaultWebpagePreferences.preferredContentMode = .mobile
    }

    let wv = WKWebView(frame: view.bounds, configuration: config)
    wv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    wv.isOpaque = false
    wv.backgroundColor = view.backgroundColor
    wv.scrollView.isScrollEnabled = false
    wv.scrollView.bounces = false
    wv.scrollView.contentInsetAdjustmentBehavior = .never
    wv.allowsBackForwardNavigationGestures = false
    if #available(iOS 16.4, *) {
      wv.isInspectable = true
    }
    webView = wv
    view.addSubview(wv)

    if let url = URL(string: "yolkrush://game/index.html") {
      wv.load(URLRequest(url: url))
    }
  }

  func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
    guard let url = urlSchemeTask.request.url else {
      urlSchemeTask.didFailWithError(URLError(.badURL))
      return
    }

    var rel = url.path
    if rel.isEmpty || rel == "/" { rel = "/index.html" }
    if rel.hasPrefix("/") { rel.removeFirst() }
    if rel.isEmpty { rel = "index.html" }

    guard
      let root = Bundle.main.resourceURL?.appendingPathComponent("www"),
      let data = try? Data(contentsOf: root.appendingPathComponent(rel))
    else {
      urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
      return
    }

    let ext = (rel as NSString).pathExtension.lowercased()
    let mime = Self.mime(ext)
    let headers = [
      "Content-Type": mime,
      "Access-Control-Allow-Origin": "*",
      "Content-Length": "\(data.count)",
    ]
    guard let response = HTTPURLResponse(
      url: url,
      statusCode: 200,
      httpVersion: "HTTP/1.1",
      headerFields: headers
    ) else {
      urlSchemeTask.didFailWithError(URLError(.cannotParseResponse))
      return
    }
    urlSchemeTask.didReceive(response)
    urlSchemeTask.didReceive(data)
    urlSchemeTask.didFinish()
  }

  func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

  private static func mime(_ ext: String) -> String {
    switch ext {
    case "html": return "text/html"
    case "js", "mjs": return "text/javascript"
    case "css": return "text/css"
    case "json", "webmanifest": return "application/json"
    case "png": return "image/png"
    case "jpg", "jpeg": return "image/jpeg"
    case "svg": return "image/svg+xml"
    case "webp": return "image/webp"
    case "wasm": return "application/wasm"
    case "woff2": return "font/woff2"
    case "mp3": return "audio/mpeg"
    default: return "application/octet-stream"
    }
  }
}
