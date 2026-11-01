// A proxy URL like http://user:pass@62.164.245.140:7534 already contains the dedicated IP,
// so the IP is always read from it rather than typed separately.
export function ipFromProxyUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!/^(https?|socks5h?):$/.test(url.protocol) || !url.hostname) return null;
    return url.hostname.replace(/^\[|\]$/g, "");
  } catch {
    return null;
  }
}
