// Comprehensive ignore patterns based on industry best practices
// Researched from gitignore templates and development community standards

export const IGNORE_PATTERNS = {
  // JavaScript/Node.js
  javascript: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/.nuxt/**',
    '**/.output/**',
    '**/.vercel/**',
    '**/.netlify/**',
    '**/out/**',
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/npm-debug.log*',
    '**/yarn-debug.log*',
    '**/yarn-error.log*',
    '**/.pnpm-store/**',
    '**/.turbo/**'
  ],

  // Python
  python: [
    '**/__pycache__/**',
    '**/*.pyc',
    '**/*.pyd',
    '**/.Python',
    '**/build/**',
    '**/develop-eggs/**',
    '**/dist/**',
    '**/downloads/**',
    '**/eggs/**',
    '**/.eggs/**',
    '**/lib/**',
    '**/lib64/**',
    '**/parts/**',
    '**/sdist/**',
    '**/var/**',
    '**/*.egg-info/**',
    '**/.installed.cfg',
    '**/*.egg',
    '**/.venv/**',
    '**/venv/**',
    '**/env/**',
    '**/ENV/**',
    '**/.pytest_cache/**',
    '**/htmlcov/**',
    '**/.tox/**',
    '**/.coverage',
    '**/.hypothesis/**',
    '**/.mypy_cache/**',
    '**/.ruff_cache/**'
  ],

  // Java/Maven
  java: [
    '**/target/**',
    '**/.gradle/**',
    '**/build/**',
    '**/.idea/**',
    '**/*.iml',
    '**/out/**',
    '**/gen/**',
    '**/classes/**',
    '**/.classpath',
    '**/.project',
    '**/.settings/**',
    '**/.m2/**',
    '**/*.class',
    '**/*.jar',
    '**/*.war',
    '**/*.ear'
  ],

  // Android
  android: [
    '**/.gradle/**',
    '**/build/**',
    '**/.idea/**',
    '**/*.iml',
    '**/local.properties',
    '**/captures/**',
    '**/.externalNativeBuild/**',
    '**/.cxx/**',
    '**/*.apk',
    '**/*.aar',
    '**/*.ap_',
    '**/*.dex',
    '**/google-services.json',
    '**/gradle-app.setting',
    '**/.navigation/**'
  ],

  // iOS/Swift
  ios: [
    '**/Pods/**',
    '**/DerivedData/**',
    '**/xcuserdata/**',
    '**/*.xcarchive',
    '**/build/**',
    '**/.build/**',
    '**/Packages/**',
    '**/.swiftpm/**',
    '**/Carthage/Build/**',
    '**/fastlane/report.xml',
    '**/fastlane/Preview.html',
    '**/fastlane/screenshots/**',
    '**/fastlane/test_output/**',
    '**/*.moved-aside',
    '**/*.xcuserstate',
    '**/*.hmap',
    '**/*.ipa'
  ],

  // Go
  go: [
    '**/vendor/**',
    '**/bin/**',
    '**/pkg/**',
    '**/*.exe',
    '**/*.test',
    '**/*.prof'
  ],

  // PHP
  php: [
    '**/vendor/**',
    '**/composer.phar',
    '**/composer.lock',
    '**/.phpunit.result.cache'
  ],

  // Rust
  rust: [
    '**/target/**',
    '**/Cargo.lock',
    '**/*.rs.bk'
  ],

  // Ruby
  ruby: [
    '**/vendor/bundle/**',
    '**/.bundle/**',
    '**/Gemfile.lock',
    '**/.byebug_history'
  ],

  // .NET/C#
  dotnet: [
    '**/bin/**',
    '**/obj/**',
    '**/packages/**',
    '**/*.user',
    '**/*.suo',
    '**/.vs/**',
    '**/node_modules/**'
  ],

  // Common (IDE, OS, Build tools)
  common: [
    // Version control
    '**/.git/**',
    '**/.svn/**',
    '**/.hg/**',
    '**/.bzr/**',
    
    // OS files
    '**/.DS_Store',
    '**/Thumbs.db',
    '**/desktop.ini',
    '**/$RECYCLE.BIN/**',
    
    // Backup files
    '**/*.bak',
    '**/*.backup',
    '**/*~',
    '**/*.swp',
    '**/*.swo',
    '**/*.swn',
    '**/#*#',
    '**/.#*',
    
    // Lock files (editor/runtime, not package managers)
    '**/*.lock',
    '**/.~lock*',
    
    // Logs
    '**/*.log',
    '**/logs/**',
    '**/*.log.*',
    
    // IDEs and Editors
    '**/.vscode/**',
    '**/.idea/**',
    '**/.sublime-project',
    '**/.sublime-workspace',
    '**/nbproject/**',
    '**/.settings/**',
    '**/.metadata/**',
    '**/.classpath',
    '**/.project',
    '**/.c9/**',
    '**/*.launch',
    '**/*.tmproj',
    '**/*.tmproject',
    '**/tmtags',
    
    // Vim
    '**/*~',
    '**/*.swp',
    '**/*.swo',
    '**/.*.sw?',
    '**/Session.vim',
    
    // Emacs
    '**/*~',
    '**/#*#',
    '**/.#*',
    
    // Environment files (secrets)
    '**/.env',
    '**/.env.local',
    '**/.env.*.local',
    '**/.env.production',
    '**/.env.development',
    '**/.env.test',
    '**/secrets.json',
    '**/secrets.yaml',
    '**/secrets.yml',
    '**/*.key',
    '**/*.pem',
    '**/*.crt',
    '**/*.cer',
    '**/*.p12',
    '**/*.pfx',
    
    // Temporary files
    '**/tmp/**',
    '**/temp/**',
    '**/*.tmp',
    '**/*.temp',
    '**/.cache/**',
    
    // Session & runtime
    '**/.sass-cache/**',
    '**/connect.lock',
    '**/*.pid',
    '**/*.seed',
    '**/*.pid.lock',
    
    // Coverage & test output
    '**/coverage/**',
    '**/.nyc_output/**',
    '**/test-results/**',
    '**/*.cover',
    '**/*.coverage',
    '**/htmlcov/**',
    
    // Documentation builds
    '**/docs/_build/**',
    '**/site/**',
    
    // Misc
    '**/*.orig',
    '**/core',
    '**/*.core',
    
    // ============================================
    // DATABASE FILES
    // ============================================
    '**/*.rdb',           // Redis
    '**/*.sqlite',        // SQLite
    '**/*.sqlite3',
    '**/*.db',
    '**/*.mdb',           // Access
    '**/*.accdb',
    '**/*.frm',           // MySQL table format
    '**/*.ibd',           // InnoDB
    '**/*.ldf',           // SQL Server log
    '**/*.mdf',           // SQL Server data
    '**/*.ndf',           // SQL Server secondary data
    '**/*.dbf',           // dBase
    '**/*.kdbx',          // KeePass
    
    // ============================================
    // ARCHIVES & COMPRESSED FILES
    // ============================================
    '**/*.zip',
    '**/*.tar',
    '**/*.gz',
    '**/*.tgz',
    '**/*.rar',
    '**/*.7z',
    '**/*.bz2',
    '**/*.xz',
    '**/*.lz',
    '**/*.lzma',
    '**/*.lzo',
    '**/*.z',
    '**/*.Z',
    '**/*.cab',
    '**/*.arj',
    '**/*.lzh',
    '**/*.ace',
    '**/*.uue',
    '**/*.pkg',           // macOS package
    '**/*.dmg',           // macOS disk image
    '**/*.iso',           // Disk image
    '**/*.img',           // Disk image
    '**/*.deb',           // Debian package
    '**/*.rpm',           // RedHat package
    '**/*.msi',           // Windows installer
    '**/*.appimage',      // Linux AppImage
    '**/*.snap',          // Snap package
    '**/*.flatpak',       // Flatpak
    
    // ============================================
    // IMAGES & GRAPHICS
    // ============================================
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.gif',
    '**/*.ico',
    '**/*.bmp',
    '**/*.webp',
    '**/*.tiff',
    '**/*.tif',
    '**/*.psd',           // Photoshop
    '**/*.ai',            // Illustrator
    '**/*.eps',
    '**/*.raw',
    '**/*.cr2',           // Canon RAW
    '**/*.nef',           // Nikon RAW
    '**/*.orf',           // Olympus RAW
    '**/*.sr2',           // Sony RAW
    '**/*.heic',          // Apple HEIF
    '**/*.heif',
    '**/*.avif',
    '**/*.jxl',           // JPEG XL
    '**/*.xcf',           // GIMP
    '**/*.sketch',        // Sketch
    '**/*.fig',           // Figma (exported)
    '**/*.indd',          // InDesign
    '**/*.blend',         // Blender
    '**/*.fbx',           // 3D model
    '**/*.obj',           // 3D object (also compiled, already covered)
    '**/*.stl',           // 3D printing
    '**/*.3ds',           // 3D Studio
    '**/*.dae',           // Collada
    '**/*.gltf',          // GL Transmission Format
    '**/*.glb',           // Binary GLTF
    '**/*.usdz',          // Apple AR
    
    // ============================================
    // FONTS
    // ============================================
    '**/*.woff',
    '**/*.woff2',
    '**/*.ttf',
    '**/*.eot',
    '**/*.otf',
    '**/*.fon',
    '**/*.fnt',
    '**/*.pfb',
    '**/*.pfm',
    
    // ============================================
    // AUDIO FILES
    // ============================================
    '**/*.mp3',
    '**/*.wav',
    '**/*.ogg',
    '**/*.m4a',
    '**/*.aac',
    '**/*.flac',
    '**/*.wma',
    '**/*.aiff',
    '**/*.aif',
    '**/*.mid',
    '**/*.midi',
    '**/*.opus',
    '**/*.ra',
    '**/*.ram',
    
    // ============================================
    // VIDEO FILES
    // ============================================
    '**/*.mp4',
    '**/*.avi',
    '**/*.mov',
    '**/*.mkv',
    '**/*.flv',
    '**/*.wmv',
    '**/*.webm',
    '**/*.m4v',
    '**/*.mpg',
    '**/*.mpeg',
    '**/*.3gp',
    '**/*.3g2',
    '**/*.ogv',
    '**/*.vob',
    '**/*.ts',            // Video transport stream (not TypeScript - handled by ext whitelist)
    '**/*.mts',
    '**/*.m2ts',
    
    // ============================================
    // DOCUMENTS (Non-text)
    // ============================================
    '**/*.pdf',
    '**/*.doc',
    '**/*.docx',
    '**/*.xls',
    '**/*.xlsx',
    '**/*.ppt',
    '**/*.pptx',
    '**/*.odt',           // OpenDocument
    '**/*.ods',
    '**/*.odp',
    '**/*.odg',
    '**/*.odf',
    '**/*.rtf',
    '**/*.wps',
    '**/*.wpd',
    '**/*.pages',         // Apple Pages
    '**/*.numbers',       // Apple Numbers
    '**/*.key',           // Apple Keynote (also certs, already covered)
    '**/*.epub',
    '**/*.mobi',
    '**/*.azw',
    '**/*.azw3',
    '**/*.djvu',
    '**/*.xps',
    
    // ============================================
    // COMPILED BINARIES & EXECUTABLES
    // ============================================
    '**/*.so',            // Unix shared object
    '**/*.dylib',         // macOS dynamic library
    '**/*.dll',           // Windows DLL
    '**/*.exe',           // Windows executable
    '**/*.com',           // DOS executable
    '**/*.o',             // Object file
    '**/*.a',             // Static library (Unix)
    '**/*.lib',           // Static library (Windows)
    '**/*.obj',           // Object file (Windows)
    '**/*.ko',            // Kernel object
    '**/*.elf',           // ELF binary
    '**/*.bin',           // Binary
    '**/*.out',           // Unix output
    '**/*.app',           // macOS app bundle
    '**/*.framework/**',  // macOS/iOS framework
    '**/*.xcframework/**',
    '**/*.wasm',          // WebAssembly
    '**/*.pdb',           // Debug symbols (Windows)
    '**/*.dSYM/**',       // Debug symbols (macOS)
    '**/*.sym',           // Symbol file
    
    // ============================================
    // JAVA/JVM COMPILED
    // ============================================
    '**/*.class',
    '**/*.jar',
    '**/*.war',
    '**/*.ear',
    '**/*.sar',
    '**/*.nar',
    '**/*.hpi',           // Jenkins plugin
    '**/*.jpi',
    
    // ============================================
    // .NET COMPILED
    // ============================================
    '**/*.nupkg',         // NuGet package
    '**/*.snupkg',        // Symbol package
    
    // ============================================
    // PYTHON COMPILED
    // ============================================
    '**/*.pyc',
    '**/*.pyo',
    '**/*.pyd',
    '**/*.whl',           // Wheel package
    '**/*.egg',
    
    // ============================================
    // MOBILE BINARIES
    // ============================================
    '**/*.apk',           // Android
    '**/*.aab',           // Android App Bundle
    '**/*.ipa',           // iOS
    '**/*.xapk',          // Split APK
    '**/*.obb',           // Android expansion
    
    // ============================================
    // GENERATED/MINIFIED FILES
    // ============================================
    '**/*.map',           // Source maps
    '**/*.min.js',
    '**/*.min.css',
    '**/*.min.html',
    '**/*.bundle.js',
    '**/*.chunk.js',
    '**/*.chunk.css',
    '**/-*.js',           // Next.js chunks
    '**/_buildManifest.js',
    '**/_ssgManifest.js',
    '**/vendor.js',       // Bundled vendor
    '**/polyfills.js',
    '**/runtime.js',
    '**/main.*.js',       // Hashed output
    '**/styles.*.css',
    
    // ============================================
    // PACKAGE MANAGER BINARIES
    // ============================================
    '**/*.lockb',         // Bun lock binary
    '**/shrinkwrap.yaml', // pnpm
    
    // ============================================
    // MACHINE LEARNING & DATA
    // ============================================
    '**/*.h5',            // HDF5 / Keras
    '**/*.hdf5',
    '**/*.pkl',           // Pickle
    '**/*.pickle',
    '**/*.joblib',
    '**/*.npy',           // NumPy
    '**/*.npz',
    '**/*.pt',            // PyTorch
    '**/*.pth',
    '**/*.onnx',          // ONNX
    '**/*.pb',            // TensorFlow protobuf
    '**/*.tflite',        // TensorFlow Lite
    '**/*.mlmodel',       // Core ML
    '**/*.caffemodel',    // Caffe
    '**/*.ckpt',          // Checkpoint
    '**/*.safetensors',   // Safe Tensors
    '**/*.gguf',          // GGML/llama.cpp
    '**/*.bin',           // Model weights
    '**/*.msgpack',       // MessagePack
    '**/*.parquet',       // Apache Parquet
    '**/*.arrow',         // Apache Arrow
    '**/*.feather',       // Feather format
    '**/*.csv.gz',        // Compressed data
    '**/*.jsonl.gz',
    
    // ============================================
    // GAME DEVELOPMENT
    // ============================================
    '**/*.unity',         // Unity
    '**/*.unitypackage',
    '**/*.asset',
    '**/*.prefab',
    '**/*.mat',           // Material
    '**/*.physicMaterial',
    '**/*.controller',
    '**/*.anim',          // Animation
    '**/*.mask',
    '**/*.flare',
    '**/*.compute',
    '**/*.spriteatlas',
    '**/*.uasset',        // Unreal
    '**/*.umap',
    '**/*.upk',
    '**/Content/**/*.uasset',
    
    // ============================================
    // MISC BINARY/NON-CODE
    // ============================================
    '**/*.dat',           // Generic data
    '**/*.data',
    '**/*.bson',          // Binary JSON
    '**/*.avro',          // Apache Avro
    '**/*.thrift',        // Compiled Thrift
    '**/*.cap',           // Packet capture
    '**/*.pcap',
    '**/*.pcapng',
    '**/*.dmp',           // Crash dump
    '**/*.mdmp',          // Minidump
    '**/*.hprof',         // Java heap dump
    '**/*.prof',          // Profile data
    '**/*.trace',         // Trace file
    '**/*.lnk',           // Windows shortcut
    '**/*.url',           // Internet shortcut
    '**/*.webloc',        // macOS web location
    '**/*.torrent',       // Torrent file
    '**/*.crx',           // Chrome extension
    '**/*.xpi',           // Firefox extension
    '**/*.vsix',          // VS Code extension
    
    // ============================================
    // CI/CD & DEVOPS
    // ============================================
    '**/.github/actions/**/dist/**',  // GitHub Actions compiled
    '**/terraform.tfstate',
    '**/terraform.tfstate.backup',
    '**/.terraform/**',
    '**/terraform.tfvars',
    '**/*.tfplan',
    '**/pulumi.*.yaml',
    '**/.pulumi/**',
    '**/cdk.out/**',
    '**/.serverless/**',
    '**/.aws-sam/**',
    '**/amplify/**/#current-cloud-backend/**',
    '**/firebase-debug.log',
    '**/.firebase/**',
    '**/firestore-debug.log',
    
    // ============================================
    // CONTAINER & ORCHESTRATION
    // ============================================
    '**/docker-compose.override.yml',
    '**/.docker/**',
    '**/helm/charts/**/*.tgz',
    '**/.kube/cache/**',
    '**/*.dockerignore',  // Not code
    
    // ============================================
    // VIRTUALIZATION
    // ============================================
    '**/*.vmdk',          // VMware disk
    '**/*.vdi',           // VirtualBox disk
    '**/*.vhd',           // Hyper-V disk
    '**/*.vhdx',
    '**/*.qcow',          // QEMU disk
    '**/*.qcow2',
    '**/.vagrant/**',
    '**/Vagrantfile.local',
    
    // ============================================
    // ELIXIR/ERLANG
    // ============================================
    '**/_build/**',
    '**/deps/**',
    '**/*.beam',          // Compiled Erlang
    '**/*.ez',            // Erlang archive
    '**/erl_crash.dump',
    '**/.fetch',
    '**/mix.lock',        // Elixir lock (consider keeping)
    
    // ============================================
    // HASKELL
    // ============================================
    '**/.stack-work/**',
    '**/dist-newstyle/**',
    '**/*.hi',            // Haskell interface
    '**/*.chi',
    '**/*.chs.h',
    '**/*.dyn_hi',
    '**/*.dyn_o',
    
    // ============================================
    // SCALA/SBT
    // ============================================
    '**/project/target/**',
    '**/project/project/**',
    '**/.bsp/**',
    '**/.metals/**',
    '**/.bloop/**',
    
    // ============================================
    // CLOJURE
    // ============================================
    '**/target/**',
    '**/repl/**',
    '**/.lein-*',
    '**/.nrepl-port',
    '**/.cpcache/**',
    '**/.clj-kondo/.cache/**',
    
    // ============================================
    // JULIA
    // ============================================
    '**/.julia/**',
    '**/Manifest.toml',   // Julia lock
    '**/docs/build/**',
    
    // ============================================
    // R / RSTUDIO
    // ============================================
    '**/.Rproj.user/**',
    '**/.Rhistory',
    '**/.RData',
    '**/rsconnect/**',
    '**/*.Rproj',
    
    // ============================================
    // LATEX
    // ============================================
    '**/*.aux',
    '**/*.lof',
    '**/*.lot',
    '**/*.fls',
    '**/*.out',
    '**/*.toc',
    '**/*.fmt',
    '**/*.fot',
    '**/*.cb',
    '**/*.cb2',
    '**/*.bbl',
    '**/*.bcf',
    '**/*.blg',
    '**/*.synctex.gz',
    '**/*.synctex',
    '**/*.pdfsync',
    '**/*.fdb_latexmk',
    '**/*.run.xml',
    
    // ============================================
    // C/C++ BUILD ARTIFACTS
    // ============================================
    '**/CMakeCache.txt',
    '**/CMakeFiles/**',
    '**/cmake_install.cmake',
    '**/Makefile.in',
    '**/autom4te.cache/**',
    '**/config.status',
    '**/config.log',
    '**/configure~',
    '**/*.gch',           // Precompiled header
    '**/*.pch',
    '**/*.d',             // Dependency files
    
    // ============================================
    // DART/FLUTTER
    // ============================================
    '**/.dart_tool/**',
    '**/.packages',
    '**/pubspec.lock',
    '**/build/**',
    '**/*.g.dart',        // Generated
    '**/*.freezed.dart',
    '**/*.gr.dart',
    '**/ios/Pods/**',
    '**/ios/.symlinks/**',
    '**/android/.gradle/**',
    '**/windows/flutter/ephemeral/**',
    '**/macos/Flutter/ephemeral/**',
    '**/linux/flutter/ephemeral/**',
    
    // ============================================
    // KOTLIN MULTIPLATFORM
    // ============================================
    '**/kotlin-js-store/**',
    '**/.kotlin/**',
    
    // ============================================
    // REACT NATIVE
    // ============================================
    '**/ios/build/**',
    '**/android/build/**',
    '**/android/app/build/**',
    '**/.expo/**',
    '**/web-build/**',
    
    // ============================================
    // ELECTRON
    // ============================================
    '**/release/**',
    '**/app-builds/**',
    '**/*.asar',
    
    // ============================================
    // DOCUMENTATION GENERATORS
    // ============================================
    '**/docs/_build/**',
    '**/_site/**',
    '**/.docusaurus/**',
    '**/public/**',       // Static site output (careful - may want to keep)
    '**/storybook-static/**',
    '**/.storybook/build/**',
    '**/.vuepress/dist/**',
    '**/.vitepress/dist/**',
    '**/book/**',         // mdBook output
    
    // ============================================
    // EDITOR/TOOL METADATA
    // ============================================
    '**/.history/**',     // Local history
    '**/.ionide/**',      // F# IDE
    '**/.ensime_cache/**',// Scala
    '**/.ammonite/**',    // Scala REPL
    '**/.bsp/**',
    '**/.worksheet/**',
    '**/.scalafmt.conf',
    '**/.scalafix.conf',
    
    // ============================================
    // SECURITY/SECRETS (Never index)
    // ============================================
    '**/*.keystore',
    '**/*.jks',           // Java keystore
    '**/*.p8',
    '**/*.mobileprovision',
    '**/*.provisionprofile',
    '**/id_rsa',
    '**/id_rsa.pub',
    '**/id_ed25519',
    '**/id_ed25519.pub',
    '**/*.gpg',
    '**/*.asc',
    '**/credentials.json',
    '**/service-account*.json',
    '**/gcloud/**',
    '**/.netrc',
    '**/.npmrc',
    '**/.yarnrc',
    '**/.pypirc',
    
    // ============================================
    // MISC TOOLS & EDGE CASES
    // ============================================
    '**/*.swc',           // SWC cache
    '**/.parcel-cache/**',
    '**/.cache/**',
    '**/.turbo/**',
    '**/.wireit/**',
    '**/tsconfig.tsbuildinfo',
    '**/.eslintcache',
    '**/.stylelintcache',
    '**/.prettiercache',
    '**/.rpt2_cache/**',  // Rollup TypeScript
    '**/vite.config.*.timestamp-*',
    '**/*.tsbuildinfo',
    '**/.nx/**',          // Nx cache
    '**/reports/**',
    '**/test-results/**',
    '**/playwright-report/**',
    '**/allure-results/**',
    '**/cypress/videos/**',
    '**/cypress/screenshots/**',
    '**/__snapshots__/**',
    '**/*.snap'           // Jest snapshots (consider keeping)
  ]
};

// Map marker files to project types
export const FILE_TYPE_MAP = {
  // JavaScript/Node
  'package.json': 'javascript',
  'package-lock.json': 'javascript',
  'yarn.lock': 'javascript',
  'pnpm-lock.yaml': 'javascript',
  
  // Python
  'requirements.txt': 'python',
  'Pipfile': 'python',
  'pyproject.toml': 'python',
  'setup.py': 'python',
  
  // Android
  'build.gradle': 'android',
  'build.gradle.kts': 'android',
  'settings.gradle': 'android',
  
  // Java
  'pom.xml': 'java',
  
  // iOS
  'Podfile': 'ios',
  'Package.swift': 'ios',
  
  // Go
  'go.mod': 'go',
  
  // PHP
  'composer.json': 'php',
  
  // Rust
  'Cargo.toml': 'rust',
  
  // Ruby
  'Gemfile': 'ruby',
  
  // .NET
  '*.csproj': 'dotnet',
  '*.sln': 'dotnet'
};
