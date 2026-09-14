<!doctype html>
<html lang="zh-CN">
<head>
  @php
    $shenlanColors = [
      'electric_blue' => '#3577f6',
      'violet' => '#7767f4',
      'cyan' => '#1db7c9'
    ];
    $shenlanColorKey = isset($theme_config['theme_color']) ? $theme_config['theme_color'] : 'electric_blue';
    $shenlanOptions = [
      'accent' => isset($shenlanColors[$shenlanColorKey]) ? $shenlanColors[$shenlanColorKey] : '#3577f6',
      'hero_title' => isset($theme_config['hero_title']) ? $theme_config['hero_title'] : '让每一次连接，都快人一步',
      'hero_description' => isset($theme_config['hero_description']) ? $theme_config['hero_description'] : '低延迟全球网络、清晰的订阅管理和专注体验的客户端支持。'
    ];
  @endphp
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="{{ $shenlanOptions['accent'] }}">
  <meta name="description" content="{{ $description }}">
  <title>{{ $title }}</title>
  <link rel="stylesheet" href="/theme/{{ $theme }}/assets/app-1.0.9.css?v=shenlan-1.0.9">
  <script>
    window.routerBase = "/";
    window.settings = {
      title: {!! json_encode($title, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!},
      logo: {!! json_encode($logo, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!},
      description: {!! json_encode($description, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!},
      assets_path: "/theme/{{ $theme }}/assets",
      version: {!! json_encode($version, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!},
      shenlan: {!! json_encode($shenlanOptions, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) !!}
    };
  </script>
</head>
<body>
  <div id="root"></div>
  {!! isset($theme_config['custom_html']) ? $theme_config['custom_html'] : '' !!}
  <script type="module" src="/theme/{{ $theme }}/assets/app-1.0.9.js?v=shenlan-1.0.9"></script>
</body>
</html>
