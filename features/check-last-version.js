// Using native global fetch (Node.js 18+)

/**
 * Version checker for package registries across multiple ecosystems.
 * Supports caching and automatic retry for transient failures.
 */
export class VersionChecker {
  /**
   * Creates a new VersionChecker instance.
   * @param {Object} config - Configuration object
   * @param {number} [config.versionCheckTimeout=5000] - Timeout for API requests in ms
   * @param {number} [config.versionCacheTTL=300000] - Cache TTL in ms (default: 5 minutes)
   * @param {number} [config.retryAttempts=1] - Number of retry attempts for failed requests
   * @param {number} [config.retryDelay=500] - Delay between retries in ms
   */
  constructor(config) {
    this.config = config;
    this.timeout = config.versionCheckTimeout || 5000;
    this.cacheTTL = config.versionCacheTTL || 300000; // 5 minutes
    this.retryAttempts = config.retryAttempts ?? 1;
    this.retryDelay = config.retryDelay || 500;
    
    // Simple in-memory cache: Map<cacheKey, { data, timestamp }>
    this.cache = new Map();
  }

  /**
   * Checks the latest version of a package from its registry.
   * @param {string} packageName - Package name (may include ecosystem prefix like "npm:")
   * @param {string} [ecosystem] - Ecosystem identifier (auto-detected if not provided)
   * @returns {Promise<Object>} Result object with package, ecosystem, version, found, source, or error
   */
  async checkVersion(packageName, ecosystem) {
    try {
      // 1. Sanitization
      if (!packageName || typeof packageName !== 'string') {
        throw new Error("Invalid package name");
      }
      packageName = packageName.trim();

      // 2. Auto-detect
      if (!ecosystem) {
        ecosystem = this._detectEcosystem(packageName);
      } else {
        ecosystem = ecosystem.toLowerCase().trim();
      }

      // 3. Check cache
      const cacheKey = `${ecosystem || 'unknown'}:${packageName}`;
      const cached = this._getFromCache(cacheKey);
      if (cached) {
        return { ...cached, fromCache: true };
      }

      // 4. Fetch
      const result = await this._fetchVersion(packageName, ecosystem);
      const response = {
        package: packageName,
        ecosystem: ecosystem || "unknown",
        ...result
      };

      // 5. Cache successful results
      if (result.found) {
        this._setCache(cacheKey, response);
      }

      return response;
    } catch (error) {
      return {
        package: packageName,
        ecosystem: ecosystem || "unknown",
        error: error.message,
        found: false,
        message: `Failed to check version: ${error.message}`
      };
    }
  }

  /**
   * Gets a value from cache if it exists and hasn't expired.
   * @param {string} key - Cache key
   * @returns {Object|null} Cached data or null
   * @private
   */
  _getFromCache(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Sets a value in the cache.
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @private
   */
  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clears the version cache.
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Detects the ecosystem from package name prefixes.
   * @param {string} packageName - Package name with optional prefix
   * @returns {string|null} Detected ecosystem or null
   * @private
   */
  _detectEcosystem(packageName) {
    // Check specific prefixes first (order matters - more specific before generic)
    if (packageName.startsWith("npm:")) return "npm";
    if (packageName.startsWith("pip:")) return "pypi";
    if (packageName.startsWith("go:")) return "go";
    if (packageName.startsWith("cargo:")) return "crates";
    if (packageName.startsWith("gem:")) return "rubygems";
    if (packageName.startsWith("composer:")) return "packagist";
    if (packageName.startsWith("nuget:")) return "nuget";
    if (packageName.startsWith("pod:")) return "cocoapods";
    if (packageName.startsWith("hex:")) return "hex";
    
    // R ecosystem
    if (packageName.startsWith("cran:") || packageName.startsWith("R:")) return "cran";
    // Perl ecosystem
    if (packageName.startsWith("cpan:") || packageName.startsWith("perl:")) return "cpan";
    // Dart ecosystem
    if (packageName.startsWith("dart:") || packageName.startsWith("pub:")) return "pub";
    
    // Homebrew
    if (packageName.startsWith("brew:")) return "homebrew";
    // Conda
    if (packageName.startsWith("conda:")) return "conda";
    // Clojars (Clojure)
    if (packageName.startsWith("clojars:") || packageName.startsWith("clj:")) return "clojars";
    // Hackage (Haskell)
    if (packageName.startsWith("hackage:") || packageName.startsWith("haskell:")) return "hackage";
    // Julia
    if (packageName.startsWith("julia:") || packageName.startsWith("jl:")) return "julia";
    // Swift Package Manager
    if (packageName.startsWith("swift:") || packageName.startsWith("spm:")) return "swift";
    // Chocolatey (Windows)
    if (packageName.startsWith("choco:")) return "chocolatey";
    
    // Check for Maven patterns last (generic colon for group:artifact or explicit mvn:)
    if (packageName.startsWith("mvn:") || packageName.includes(":")) return "maven";
    
    return null;
  }

  /**
   * Fetches with automatic retry for transient failures.
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @param {number} [retriesLeft] - Number of retries remaining
   * @returns {Promise<Response>} Fetch response
   * @private
   */
  async _fetchWithRetry(url, options, retriesLeft = this.retryAttempts) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (retriesLeft > 0) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this._fetchWithRetry(url, options, retriesLeft - 1);
      }
      throw err;
    }
  }

  /**
   * Fetches the latest version from the appropriate registry.
   * @param {string} pkgInput - Package name (with or without prefix)
   * @param {string} ecosystem - Target ecosystem
   * @returns {Promise<Object>} Result with version info or error
   * @private
   */
  async _fetchVersion(pkgInput, ecosystem) {
    const signal = AbortSignal.timeout(this.timeout);
    let url, version;

    // Helper to handle simple JSON fetch with specific 404 message
    const fetchJson = async (u, errorPrefix) => {
      const res = await this._fetchWithRetry(u, { signal });
      if (res.status === 404) throw new Error(`${errorPrefix} not found (404)`);
      if (!res.ok) throw new Error(`${errorPrefix} registry error: ${res.status} ${res.statusText}`);
      return res.json();
    };

    switch (ecosystem) {
      case "npm":
        let npmPkg = pkgInput.replace("npm:", "");
        if (npmPkg.startsWith("@") && npmPkg.includes("/")) {
           npmPkg = npmPkg.replace("/", "%2f");
        }
        url = `https://registry.npmjs.org/${npmPkg}`;
        const npmData = await fetchJson(url, "npm package");
        version = npmData["dist-tags"]?.latest;
        break;

      case "pypi":
        url = `https://pypi.org/pypi/${pkgInput.replace("pip:", "")}/json`;
        const pypiData = await fetchJson(url, "PyPI package");
        version = pypiData.info?.version;
        break;

      case "packagist":
        const packPkg = pkgInput.replace("composer:", "");
        const parts = packPkg.split("/");
        if (parts.length !== 2) throw new Error("Packagist package must be in 'vendor/package' format");
        url = `https://repo.packagist.org/p2/${packPkg}.json`;
        const packData = await fetchJson(url, "Packagist package");
        const versions = packData.packages[packPkg];
        if (!versions || versions.length === 0) throw new Error("No versions found in registry response");
        version = versions[0].version;
        break;

      case "crates":
        url = `https://crates.io/api/v1/crates/${pkgInput.replace("cargo:", "")}`;
        const crateRes = await this._fetchWithRetry(url, { headers: { "User-Agent": "Smart-Coding-MCP" }, signal });
        if (crateRes.status === 404) throw new Error("Crate not found (404)");
        if (!crateRes.ok) throw new Error(`Crates.io error: ${crateRes.status}`);
        const crateData = await crateRes.json();
        version = crateData.crate?.max_stable_version || crateData.crate?.newest_version;
        break;

      case "maven":
        const mvnPkg = pkgInput.replace("mvn:", "");
        const [g, a] = mvnPkg.split(":");
        if (!g || !a) throw new Error("Maven artifact must be in 'group:artifact' format");
        url = `https://search.maven.org/solrsearch/select?q=g:"${g}"+AND+a:"${a}"&wt=json`;
        const mvnRes = await this._fetchWithRetry(url, { signal });
        if (!mvnRes.ok) throw new Error(`Maven Central error: ${mvnRes.status}`);
        const mvnData = await mvnRes.json();
        if (mvnData.response?.docs?.length > 0) {
          version = mvnData.response.docs[0].latestVersion;
        } else {
          throw new Error("Maven artifact not found");
        }
        break;

      case "go":
        url = `https://proxy.golang.org/${pkgInput.replace("go:", "")}/@latest`;
        const goData = await fetchJson(url, "Go module");
        version = goData.Version;
        break;

      case "rubygems":
        url = `https://rubygems.org/api/v1/versions/${pkgInput.replace("gem:", "")}/latest.json`;
        const gemData = await fetchJson(url, "Gem");
        version = gemData.version;
        break;

      case "nuget":
        const nugetPkg = pkgInput.replace("nuget:", "").toLowerCase();
        url = `https://api.nuget.org/v3-flatcontainer/${nugetPkg}/index.json`;
        const nugetData = await fetchJson(url, "NuGet package");
        if (nugetData.versions && nugetData.versions.length > 0) {
          version = nugetData.versions[nugetData.versions.length - 1];
        } else {
          throw new Error("No versions found");
        }
        break;

      case "cocoapods":
        // CocoaPods trunk API requires special client authentication.
        // The API returns pod metadata but version info requires parsing specs repo.
        // We intentionally fall back to suggesting a web search for reliable results.
        url = `https://trunk.cocoapods.org/api/v1/pods/${pkgInput.replace("pod:", "")}`;
        const podRes = await this._fetchWithRetry(url, { signal });
        if (podRes.ok) {
           throw new Error("CocoaPods API requires client; please perform a web search.");
        }
        throw new Error("CocoaPods lookup not supported directly; please perform a web search.");

      case "hex":
        url = `https://hex.pm/api/packages/${pkgInput.replace("hex:", "")}`;
        const hexData = await fetchJson(url, "Hex package");
        if (hexData.releases && hexData.releases.length > 0) {
          version = hexData.releases[0].version;
        } else {
          throw new Error("No releases found");
        }
        break;
      
      case "cran":
        // R packages from CRAN
        const cranPkg = pkgInput.replace(/^R:|^cran:/i, "");
        url = `https://crandb.r-pkg.org/${cranPkg}`;
        const cranData = await fetchJson(url, "CRAN package");
        version = cranData.Version;
        break;

      case "cpan":
        // Perl modules from CPAN/MetaCPAN
        const cpanPkg = pkgInput.replace(/^perl:|^cpan:/i, "");
        url = `https://fastapi.metacpan.org/v1/module/${cpanPkg}`;
        const cpanData = await fetchJson(url, "CPAN module");
        version = cpanData.version;
        break;

      case "pub":
        // Dart packages from pub.dev
        const pubPkg = pkgInput.replace(/^dart:|^pub:/i, "");
        url = `https://pub.dev/api/packages/${pubPkg}`;
        const pubData = await fetchJson(url, "pub.dev package");
        version = pubData.latest?.version;
        break;

      case "homebrew":
        // Homebrew formulae (macOS/Linux)
        const brewPkg = pkgInput.replace(/^brew:/i, "");
        url = `https://formulae.brew.sh/api/formula/${brewPkg}.json`;
        const brewData = await fetchJson(url, "Homebrew formula");
        version = brewData.versions?.stable;
        break;

      case "conda":
        // Conda packages (defaults channel via anaconda.org)
        const condaPkg = pkgInput.replace(/^conda:/i, "");
        // Try conda-forge first, then defaults
        url = `https://api.anaconda.org/package/conda-forge/${condaPkg}`;
        try {
          const condaData = await fetchJson(url, "Conda package");
          version = condaData.latest_version;
        } catch {
          // Fallback to main channel
          url = `https://api.anaconda.org/package/anaconda/${condaPkg}`;
          const condaData2 = await fetchJson(url, "Conda package");
          version = condaData2.latest_version;
        }
        break;

      case "clojars":
        // Clojure packages from Clojars
        const cljPkg = pkgInput.replace(/^clojars:|^clj:/i, "");
        // Format: group/artifact or just artifact (implies same group)
        const cljParts = cljPkg.includes("/") ? cljPkg.split("/") : [cljPkg, cljPkg];
        url = `https://clojars.org/api/artifacts/${cljParts[0]}/${cljParts[1]}`;
        const cljData = await fetchJson(url, "Clojars artifact");
        version = cljData.latest_version;
        break;

      case "hackage":
        // Haskell packages from Hackage
        const hackPkg = pkgInput.replace(/^hackage:|^haskell:/i, "");
        url = `https://hackage.haskell.org/package/${hackPkg}/preferred.json`;
        const hackData = await fetchJson(url, "Hackage package");
        // preferred.json returns array of version ranges, get the latest normal version
        if (hackData["normal-version"] && hackData["normal-version"].length > 0) {
          version = hackData["normal-version"][0];
        } else {
          throw new Error("No versions found");
        }
        break;

      case "julia":
        // Julia packages from JuliaHub/General registry
        const juliaPkg = pkgInput.replace(/^julia:|^jl:/i, "");
        url = `https://juliahub.com/ui/Packages/General/${juliaPkg}`;
        // JuliaHub doesn't have a simple JSON API, use package registry
        const juliaUrl = `https://raw.githubusercontent.com/JuliaRegistries/General/master/${juliaPkg[0].toUpperCase()}/${juliaPkg}/Versions.toml`;
        const juliaRes = await this._fetchWithRetry(juliaUrl, { signal });
        if (!juliaRes.ok) throw new Error("Julia package not found");
        const juliaText = await juliaRes.text();
        // Parse TOML to find latest version (versions are in ["x.y.z"] sections)
        const juliaVersions = juliaText.match(/\["([\d.]+)"\]/g);
        if (juliaVersions && juliaVersions.length > 0) {
          version = juliaVersions[juliaVersions.length - 1].replace(/[\["\]]/g, "");
          url = juliaUrl;
        } else {
          throw new Error("No versions found in Julia registry");
        }
        break;

      case "swift":
        // Swift Package Index
        const swiftPkg = pkgInput.replace(/^swift:|^spm:/i, "");
        // Format: owner/repo
        if (!swiftPkg.includes("/")) {
          throw new Error("Swift package must be in 'owner/repo' format");
        }
        url = `https://swiftpackageindex.com/api/packages/${swiftPkg}`;
        const swiftRes = await this._fetchWithRetry(url, { 
          headers: { "Accept": "application/json" },
          signal 
        });
        if (swiftRes.status === 404) throw new Error("Swift package not found (404)");
        if (!swiftRes.ok) throw new Error(`Swift Package Index error: ${swiftRes.status}`);
        const swiftData = await swiftRes.json();
        // Get latest stable release
        if (swiftData.releases && swiftData.releases.length > 0) {
          const stable = swiftData.releases.find(r => !r.preRelease) || swiftData.releases[0];
          version = stable.tagName?.replace(/^v/, "");
        } else {
          throw new Error("No releases found");
        }
        break;

      case "chocolatey":
        // Chocolatey (Windows) packages
        const chocoPkg = pkgInput.replace(/^choco:/i, "").toLowerCase();
        url = `https://community.chocolatey.org/api/v2/package-versions/${chocoPkg}`;
        const chocoRes = await this._fetchWithRetry(url, { signal });
        if (chocoRes.status === 404) throw new Error("Chocolatey package not found (404)");
        if (!chocoRes.ok) throw new Error(`Chocolatey error: ${chocoRes.status}`);
        const chocoVersions = await chocoRes.json();
        if (chocoVersions && chocoVersions.length > 0) {
          version = chocoVersions[chocoVersions.length - 1];
        } else {
          throw new Error("No versions found");
        }
        break;

      default:
        return {
          found: false,
          message: `Ecosystem '${ecosystem || "unknown"}' not directly supported. Please perform a web search for '${pkgInput} latest version'.`
        };
    }

    if (version) {
      return {
        found: true,
        version: version,
        source: url
      };
    }

    throw new Error("Version not found in response (parsing failed)");
  }
}

/**
 * Returns the MCP tool definition for version checking.
 * @returns {Object} Tool definition object
 */
export function getToolDefinition() {
  return {
    name: "d_check_last_version",
    description: "Get the latest version of a library/package from its official registry. Supported ecosystems: npm (JS/TS), PyPI (Python), Packagist (PHP), Crates.io (Rust), Maven (Java/Kotlin), Go, RubyGems, NuGet (.NET), Hex (Elixir), CRAN (R), CPAN (Perl), pub.dev (Dart), Homebrew (macOS), Conda (Python/R), Clojars (Clojure), Hackage (Haskell), Julia, Swift PM, Chocolatey (Windows). Returns the version string to help you avoid using outdated dependencies.",
    inputSchema: {
      type: "object",
      properties: {
        package: { 
          type: "string", 
          description: "Package name (e.g., 'express', 'requests', 'flutter', 'brew:wget', 'conda:numpy', 'swift:apple/swift-nio'). Use prefixes for explicit ecosystem detection." 
        },
        ecosystem: { 
          type: "string", 
          enum: ["npm", "pypi", "packagist", "crates", "maven", "go", "rubygems", "nuget", "cocoapods", "hex", "cran", "cpan", "pub", "homebrew", "conda", "clojars", "hackage", "julia", "swift", "chocolatey"],
          description: "Package ecosystem (optional - auto-detected from prefix)"
        }
      },
      required: ["package"]
    },
    annotations: {
      title: "Check Latest Package Version",
      readOnlyHint: true,
      idempotentHint: true
    }
  };
}

/**
 * Handles an MCP tool call for version checking.
 * @param {Object} request - MCP request object
 * @param {VersionChecker} checker - VersionChecker instance
 * @returns {Promise<Object>} MCP response object
 */
export async function handleToolCall(request, checker) {
  const pkg = request.params.arguments.package;
  const ecosystem = request.params.arguments.ecosystem;

  const result = await checker.checkVersion(pkg, ecosystem);

  if (result.found) {
    const cacheNote = result.fromCache ? " (cached)" : "";
    return {
      content: [{ 
        type: "text", 
        text: `Latest version of \`${result.package}\` (${result.ecosystem}): **${result.version}**${cacheNote}\n\nSource: ${result.source}` 
      }]
    };
  } else {
    return {
      content: [{ 
        type: "text", 
        text: result.message || `Could not find version for \`${pkg}\`. Error: ${result.error}` 
      }],
      isError: true
    };
  }
}
