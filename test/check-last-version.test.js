import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VersionChecker, getToolDefinition, handleToolCall } from '../features/check-last-version.js';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('VersionChecker Complex Suite', () => {
  let checker;
  const config = { versionCheckTimeout: 100, versionCacheTTL: 1000, retryAttempts: 1, retryDelay: 50 };

  beforeEach(() => {
    checker = new VersionChecker(config);
    fetchMock.mockReset();
  });

  describe('Input Sanitization & Validation', () => {
    it('should throw on empty or non-string package name', async () => {
      const results = await Promise.all([
        checker.checkVersion(null),
        checker.checkVersion(undefined),
        checker.checkVersion(""),
        checker.checkVersion(123)
      ]);
      results.forEach(res => {
        expect(res.found).toBe(false);
        expect(res.message).toContain("Invalid package name"); // From sanitization block
      });
    });

    it('should trim package names', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ "dist-tags": { latest: "1.0.0" } })
      });
      await checker.checkVersion("  npm:react  ");
      // Should strip whitespace and "npm:" prefix
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("registry.npmjs.org/react"), expect.any(Object));
    });
  });

  describe('Ecosystem Auto-Detection', () => {
    const ecosystems = [
      { prefix: "npm:", expected: "npm" },
      { prefix: "pip:", expected: "pypi" },
      { prefix: "go:", expected: "go" },
      { prefix: "cargo:", expected: "crates" },
      { prefix: "gem:", expected: "rubygems" },
      { prefix: "composer:", expected: "packagist" },
      { prefix: "nuget:", expected: "nuget" },
      { prefix: "pod:", expected: "cocoapods" },
      { prefix: "hex:", expected: "hex" },
      { prefix: "R:", expected: "cran" },
      { prefix: "cran:", expected: "cran" },
      { prefix: "perl:", expected: "cpan" },
      { prefix: "cpan:", expected: "cpan" },
      { prefix: "mvn:", expected: "maven" },
      { prefix: "dart:", expected: "pub" },
      { prefix: "pub:", expected: "pub" },
      // New ecosystems
      { prefix: "brew:", expected: "homebrew" },
      { prefix: "conda:", expected: "conda" },
      { prefix: "clojars:", expected: "clojars" },
      { prefix: "clj:", expected: "clojars" },
      { prefix: "hackage:", expected: "hackage" },
      { prefix: "haskell:", expected: "hackage" },
      { prefix: "julia:", expected: "julia" },
      { prefix: "jl:", expected: "julia" },
      { prefix: "swift:", expected: "swift" },
      { prefix: "spm:", expected: "swift" },
      { prefix: "choco:", expected: "chocolatey" },
    ];

    ecosystems.forEach(({ prefix, expected }) => {
      it(`should detect ${expected} from prefix '${prefix}'`, async () => {
        expect(checker._detectEcosystem(`${prefix}pkg`)).toBe(expected);
      });
    });

    it('should detect maven from group:artifact pattern (no prefix)', () => {
      expect(checker._detectEcosystem("com.google:guava")).toBe("maven");
    });

    it('should return null for unknown patterns', () => {
      expect(checker._detectEcosystem("unknown-pkg")).toBeNull();
    });
  });

  describe('Caching Behavior', () => {
    it('should cache successful results', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ "dist-tags": { latest: "1.0.0" } })
      });
      
      // First call - fetches from network
      const res1 = await checker.checkVersion("react", "npm");
      expect(res1.version).toBe("1.0.0");
      expect(res1.fromCache).toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
      
      // Second call - should return cached
      const res2 = await checker.checkVersion("react", "npm");
      expect(res2.version).toBe("1.0.0");
      expect(res2.fromCache).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it('should expire cache after TTL', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ "dist-tags": { latest: "1.0.0" } })
      });
      
      // First call
      await checker.checkVersion("react", "npm");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      
      // Wait for cache to expire (TTL is 1000ms in test config)
      await new Promise(r => setTimeout(r, 1100));
      
      // Second call should fetch again
      await checker.checkVersion("react", "npm");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should not cache failed results', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404, statusText: "Not Found" });
      
      await checker.checkVersion("missing", "npm");
      await checker.checkVersion("missing", "npm");
      
      // Both calls should hit network
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on clearCache()', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ "dist-tags": { latest: "1.0.0" } })
      });
      
      await checker.checkVersion("react", "npm");
      expect(fetchMock).toHaveBeenCalledTimes(1);
      
      checker.clearCache();
      
      await checker.checkVersion("react", "npm");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on network failure and succeed', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ "dist-tags": { latest: "1.0.0" } })
        });
      
      const res = await checker.checkVersion("react", "npm");
      expect(res.found).toBe(true);
      expect(res.version).toBe("1.0.0");
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should fail after exhausting retries', async () => {
      fetchMock.mockRejectedValue(new Error("Network error"));
      
      const res = await checker.checkVersion("react", "npm");
      expect(res.found).toBe(false);
      expect(res.message).toContain("Network error");
      // 1 initial + 1 retry = 2 calls
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should not retry on HTTP errors (non-network)', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, statusText: "Server Error" });
      
      await checker.checkVersion("react", "npm");
      // HTTP errors don't trigger retry, only network/exception errors
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Ecosystem Specific Logic (Success & Errors)', () => {
    
    // Helper to mock successful JSON response
    const mockJson = (data) => fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
    // Helper to mock 404
    const mock404 = () => fetchMock.mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" });

    // NPM
    describe('npm', () => {
      it('success', async () => {
        mockJson({ "dist-tags": { latest: "1.0.0" } });
        const res = await checker.checkVersion("react", "npm");
        expect(res.version).toBe("1.0.0");
      });
      it('scoped package encoding', async () => {
        mockJson({ "dist-tags": { latest: "1.0.0" } });
        await checker.checkVersion("@scope/pkg", "npm");
        expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("@scope%2fpkg"), expect.any(Object));
      });
      it('404 error', async () => {
        mock404();
        const res = await checker.checkVersion("missing", "npm");
        expect(res.error).toContain("npm package not found");
      });
    });

    // PyPI
    describe('pypi', () => {
      it('success', async () => {
        mockJson({ info: { version: "2.0.0" } });
        const res = await checker.checkVersion("requests", "pypi");
        expect(res.version).toBe("2.0.0");
      });
      it('404 error', async () => {
        mock404();
        const res = await checker.checkVersion("missing", "pypi");
        expect(res.error).toContain("PyPI package not found");
      });
    });

    // Packagist
    describe('packagist', () => {
      it('success', async () => {
        mockJson({ packages: { "vendor/pkg": [{ version: "3.0.0" }] } });
        const res = await checker.checkVersion("vendor/pkg", "packagist");
        expect(res.version).toBe("3.0.0");
      });
      it('validation error for invalid format', async () => {
        const res = await checker.checkVersion("invalid", "packagist");
        expect(res.error).toContain("must be in 'vendor/package' format");
      });
      it('empty versions list', async () => {
        mockJson({ packages: { "vendor/pkg": [] } });
        const res = await checker.checkVersion("vendor/pkg", "packagist");
        expect(res.error).toContain("No versions found");
      });
    });

    // Crates
    describe('crates', () => {
      it('success (max_stable_version)', async () => {
        mockJson({ crate: { max_stable_version: "1.5.0" } });
        const res = await checker.checkVersion("serde", "crates");
        expect(res.version).toBe("1.5.0");
      });
      it('success (fallback to newest_version)', async () => {
        mockJson({ crate: { max_stable_version: null, newest_version: "0.1.0-pre" } });
        const res = await checker.checkVersion("serde", "crates");
        expect(res.version).toBe("0.1.0-pre");
      });
      it('404 error', async () => {
        mock404();
        const res = await checker.checkVersion("missing", "crates");
        expect(res.error).toContain("Crate not found");
      });
    });

    // Maven
    describe('maven', () => {
      it('success', async () => {
        mockJson({ response: { docs: [{ latestVersion: "4.0.0" }] } });
        const res = await checker.checkVersion("g:a", "maven");
        expect(res.version).toBe("4.0.0");
      });
      it('validation error', async () => {
        const res = await checker.checkVersion("invalid", "maven");
        expect(res.error).toContain("must be in 'group:artifact' format");
      });
      it('not found in docs', async () => {
        mockJson({ response: { docs: [] } });
        const res = await checker.checkVersion("g:a", "maven");
        expect(res.error).toContain("Maven artifact not found");
      });
    });

    // Go
    describe('go', () => {
      it('success', async () => {
        mockJson({ Version: "v1.2.3" });
        const res = await checker.checkVersion("github.com/a/b", "go");
        expect(res.version).toBe("v1.2.3");
      });
    });

    // RubyGems
    describe('rubygems', () => {
      it('success', async () => {
        mockJson({ version: "1.0.1" });
        const res = await checker.checkVersion("rails", "rubygems");
        expect(res.version).toBe("1.0.1");
      });
    });

    // NuGet
    describe('nuget', () => {
      it('success', async () => {
        mockJson({ versions: ["1.0.0", "1.1.0"] });
        const res = await checker.checkVersion("Newtonsoft.Json", "nuget");
        expect(res.version).toBe("1.1.0");
      });
      it('empty versions', async () => {
        mockJson({ versions: [] });
        const res = await checker.checkVersion("pkg", "nuget");
        expect(res.error).toContain("No versions found");
      });
    });

    // CocoaPods
    describe('cocoapods', () => {
      it('should always suggest web search on fetch success (fallback)', async () => {
        fetchMock.mockResolvedValueOnce({ ok: true });
        const res = await checker.checkVersion("Alamofire", "cocoapods");
        expect(res.error).toContain("perform a web search");
      });
      it('should always suggest web search on fetch failure', async () => {
        mock404();
        const res = await checker.checkVersion("Alamofire", "cocoapods");
        expect(res.error).toContain("perform a web search");
      });
    });

    // Hex
    describe('hex', () => {
      it('success', async () => {
        mockJson({ releases: [{ version: "0.5.0" }] });
        const res = await checker.checkVersion("phoenix", "hex");
        expect(res.version).toBe("0.5.0");
      });
      it('empty releases', async () => {
        mockJson({ releases: [] });
        const res = await checker.checkVersion("phoenix", "hex");
        expect(res.error).toContain("No releases found");
      });
    });

    // CRAN (R)
    describe('cran', () => {
      it('success', async () => {
        mockJson({ Version: "1.0.5" });
        const res = await checker.checkVersion("dplyr", "cran");
        expect(res.version).toBe("1.0.5");
      });
    });

    // CPAN (Perl)
    describe('cpan', () => {
      it('success', async () => {
        mockJson({ version: "2.00" });
        const res = await checker.checkVersion("Moose", "cpan");
        expect(res.version).toBe("2.00");
      });
    });

    // pub.dev (Dart)
    describe('pub', () => {
      it('success', async () => {
        mockJson({ latest: { version: "3.0.0" } });
        const res = await checker.checkVersion("flutter", "pub");
        expect(res.version).toBe("3.0.0");
      });
      it('404 error', async () => {
        mock404();
        const res = await checker.checkVersion("missing", "pub");
        expect(res.error).toContain("pub.dev package not found");
      });
    });

    // Homebrew
    describe('homebrew', () => {
      it('success', async () => {
        mockJson({ versions: { stable: "3.5.0" } });
        const res = await checker.checkVersion("wget", "homebrew");
        expect(res.version).toBe("3.5.0");
      });
      it('404 error', async () => {
        mock404();
        const res = await checker.checkVersion("missing", "homebrew");
        expect(res.error).toContain("Homebrew formula not found");
      });
    });

    // Conda
    describe('conda', () => {
      it('success from conda-forge', async () => {
        mockJson({ latest_version: "1.26.0" });
        const res = await checker.checkVersion("numpy", "conda");
        expect(res.version).toBe("1.26.0");
      });
    });

    // Clojars
    describe('clojars', () => {
      it('success', async () => {
        mockJson({ latest_version: "1.11.0" });
        const res = await checker.checkVersion("ring/ring", "clojars");
        expect(res.version).toBe("1.11.0");
      });
      it('success with simple name', async () => {
        mockJson({ latest_version: "0.9.0" });
        const res = await checker.checkVersion("hiccup", "clojars");
        expect(res.version).toBe("0.9.0");
      });
    });

    // Hackage
    describe('hackage', () => {
      it('success', async () => {
        mockJson({ "normal-version": ["5.0.0", "4.9.0"] });
        const res = await checker.checkVersion("aeson", "hackage");
        expect(res.version).toBe("5.0.0");
      });
      it('empty versions', async () => {
        mockJson({ "normal-version": [] });
        const res = await checker.checkVersion("empty", "hackage");
        expect(res.error).toContain("No versions found");
      });
    });

    // Julia
    describe('julia', () => {
      it('success', async () => {
        fetchMock.mockResolvedValueOnce({ 
          ok: true, 
          text: async () => '["1.0.0"]\ngit-tree-sha1 = "abc"\n["1.1.0"]\ngit-tree-sha1 = "def"\n["2.0.0"]\ngit-tree-sha1 = "ghi"' 
        });
        const res = await checker.checkVersion("DataFrames", "julia");
        expect(res.version).toBe("2.0.0");
      });
      it('not found', async () => {
        fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });
        const res = await checker.checkVersion("missing", "julia");
        expect(res.error).toContain("Julia package not found");
      });
    });

    // Swift PM
    describe('swift', () => {
      it('success', async () => {
        fetchMock.mockResolvedValueOnce({ 
          ok: true, 
          status: 200,
          json: async () => ({ releases: [{ tagName: "v2.5.0", preRelease: false }] })
        });
        const res = await checker.checkVersion("apple/swift-nio", "swift");
        expect(res.version).toBe("2.5.0");
      });
      it('validation error for invalid format', async () => {
        const res = await checker.checkVersion("invalid", "swift");
        expect(res.error).toContain("must be in 'owner/repo' format");
      });
    });

    // Chocolatey
    describe('chocolatey', () => {
      it('success', async () => {
        fetchMock.mockResolvedValueOnce({ 
          ok: true, 
          status: 200,
          json: async () => ["1.0.0", "1.1.0", "2.0.0"]
        });
        const res = await checker.checkVersion("nodejs", "chocolatey");
        expect(res.version).toBe("2.0.0");
      });
      it('404 error', async () => {
        mock404();
        const res = await checker.checkVersion("missing", "chocolatey");
        expect(res.error).toContain("Chocolatey package not found");
      });
    });
  });

  describe('Global Error Handling', () => {
    it('should handle network timeouts via AbortSignal', async () => {
        // Use a checker with no retries to isolate timeout behavior
        const noRetryChecker = new VersionChecker({ versionCheckTimeout: 100, retryAttempts: 0 });
        
        fetchMock.mockImplementation((url, options) => {
            return new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                resolve({ ok: true, json: async () => ({}) });
              }, 200); // 200ms > 100ms config
    
              if (options.signal) {
                 options.signal.addEventListener("abort", () => {
                   clearTimeout(timeoutId);
                   reject(new Error("The operation was aborted"));
                 });
              }
            });
          });
          
      const res = await noRetryChecker.checkVersion("pkg", "npm");
      expect(res.found).toBe(false);
      expect(res.message).toMatch(/aborted|timeout/);
    });

    it('should handle non-404 registry errors (e.g. 503)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable"
      });
      const res = await checker.checkVersion("pkg", "npm");
      expect(res.found).toBe(false);
      expect(res.error).toContain("registry error: 503");
    });

    it('should handle unexpected exceptions during fetch (e.g., DNS error)', async () => {
      fetchMock.mockRejectedValue(new Error("DNS probe failed"));
      const res = await checker.checkVersion("pkg", "npm");
      expect(res.found).toBe(false);
      expect(res.message).toContain("DNS probe failed");
    });
  });

  describe('Tool Definition & Handler', () => {
    it('should return valid tool definition', () => {
      const def = getToolDefinition();
      expect(def.name).toBe("d_check_last_version");
      expect(def.inputSchema.properties.ecosystem.enum).toContain("cran");
      expect(def.inputSchema.properties.ecosystem.enum).toContain("cpan");
      expect(def.inputSchema.properties.ecosystem.enum).toContain("pub");
      // New ecosystems
      expect(def.inputSchema.properties.ecosystem.enum).toContain("homebrew");
      expect(def.inputSchema.properties.ecosystem.enum).toContain("conda");
      expect(def.inputSchema.properties.ecosystem.enum).toContain("clojars");
      expect(def.inputSchema.properties.ecosystem.enum).toContain("hackage");
      expect(def.inputSchema.properties.ecosystem.enum).toContain("julia");
      expect(def.inputSchema.properties.ecosystem.enum).toContain("swift");
      expect(def.inputSchema.properties.ecosystem.enum).toContain("chocolatey");
    });

    it('handler should format success output markdown', async () => {
      checker.checkVersion = vi.fn().mockResolvedValue({
        found: true,
        package: "test",
        ecosystem: "npm",
        version: "1.2.3",
        source: "http://src"
      });
      const res = await handleToolCall({ params: { arguments: { package: "test" } } }, checker);
      expect(res.content[0].text).toBe("Latest version of `test` (npm): **1.2.3**\n\nSource: http://src");
      expect(res.isError).toBeUndefined();
    });

    it('handler should indicate cached result', async () => {
      checker.checkVersion = vi.fn().mockResolvedValue({
        found: true,
        package: "test",
        ecosystem: "npm",
        version: "1.2.3",
        source: "http://src",
        fromCache: true
      });
      const res = await handleToolCall({ params: { arguments: { package: "test" } } }, checker);
      expect(res.content[0].text).toContain("(cached)");
    });

    it('handler should format error output', async () => {
      checker.checkVersion = vi.fn().mockResolvedValue({
        found: false,
        package: "test",
        ecosystem: "npm",
        message: "Failed"
      });
      const res = await handleToolCall({ params: { arguments: { package: "test" } } }, checker);
      expect(res.content[0].text).toBe("Failed");
      expect(res.isError).toBe(true);
    });
  });
});
