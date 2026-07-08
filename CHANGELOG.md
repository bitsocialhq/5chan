## [0.9.13](https://github.com/bitsocialnet/5chan/compare/v0.9.12...v0.9.13) (2026-07-08)


### Bug Fixes

* **deps:** replace vulnerable decompress with @xhmikosr/decompress ([c6dadc6](https://github.com/bitsocialnet/5chan/commit/c6dadc6355c7be6c9d2546482d26e368cd914450)), closes [#301](https://github.com/bitsocialnet/5chan/issues/301)
* **post ids:** never display account identity as a post user id ([#1184](https://github.com/bitsocialnet/5chan/issues/1184)) ([abe1e5a](https://github.com/bitsocialnet/5chan/commit/abe1e5a6a2bf7a746675caea257a2a33898958ea))
* **trash board:** keep hidden special boards on canonical BSO identity ([e2dc941](https://github.com/bitsocialnet/5chan/commit/e2dc9413a0373ee75c419903c5cd9193a5ec3355))



## [0.9.12](https://github.com/bitsocialnet/5chan/compare/v0.9.11...v0.9.12) (2026-07-06)


### Bug Fixes

* **agent hooks:** wire hooks into real harness entry points and fix payload parsing ([1ac3e58](https://github.com/bitsocialnet/5chan/commit/1ac3e5883bfde7697e00f101e82b2b3ff5926c41))
* **ai skills:** correct stale branch names, rg flags, and commit scope rules ([21bbc5f](https://github.com/bitsocialnet/5chan/commit/21bbc5f07c0b526e49147af1bb1a417baab3ff42))
* avoid pending post cleanup crash ([5111954](https://github.com/bitsocialnet/5chan/commit/5111954081dd9ec32f1c7a2cffeb275b56b996fe))
* **mod queue:** restrict trash action to trash board ([9dfd638](https://github.com/bitsocialnet/5chan/commit/9dfd638b71f86966694a0713fee6e762f9f8781a))
* **post transfer:** publish trash with public key ([d6f83e8](https://github.com/bitsocialnet/5chan/commit/d6f83e8abee2e61d23565b9242df8d481fa66c22))
* **subagents:** restrict read-only agent tools and remove machine-specific paths ([0166f2f](https://github.com/bitsocialnet/5chan/commit/0166f2f4e87fa8299008c04774e6532a3907e53e))



## [0.9.11](https://github.com/bitsocialnet/5chan/compare/v0.9.10...v0.9.11) (2026-07-02)


### Bug Fixes

* **reply modal:** align composer controls ([c0537cc](https://github.com/bitsocialnet/5chan/commit/c0537cc680819ead007a25a7606cb7b4921be2e3))
* **reply modal:** constrain bbcode preview width ([b90138f](https://github.com/bitsocialnet/5chan/commit/b90138f1d93523d7a29be67981163f30b7635e35))
* **reply modal:** insert YouTube links at cursor and enable conversion everywhere ([4bfe298](https://github.com/bitsocialnet/5chan/commit/4bfe298d4b2a39e777f3e4fe0f5e1b41e24411eb))
* **reply modal:** remember desktop position across opens in session ([546ee99](https://github.com/bitsocialnet/5chan/commit/546ee99f123f94aca99e19abd5272246a1fceb0e))
* **transfer modal:** remember dragged position ([e50e4e6](https://github.com/bitsocialnet/5chan/commit/e50e4e630b883d16171ac3d8a7deaad9f2620921))


### Features

* **bbcode preview:** allow resizing preview pane ([21056ae](https://github.com/bitsocialnet/5chan/commit/21056ae6b943d3c75c8cbdf3fa727f7c25d8197e))
* **mod queue:** transfer posts across boards ([#1182](https://github.com/bitsocialnet/5chan/issues/1182)) ([b4a6f0a](https://github.com/bitsocialnet/5chan/commit/b4a6f0a65afcce0414704f891925dc6bf3ba70b0))
* **trash-board:** add hidden trash board ([099fdd6](https://github.com/bitsocialnet/5chan/commit/099fdd6f3e3506984e473e957aac81e6645294c3))



## [0.9.10](https://github.com/bitsocialnet/5chan/compare/v0.9.9...v0.9.10) (2026-06-29)


### Bug Fixes

* **post form:** respect reply link rules ([69ba4ac](https://github.com/bitsocialnet/5chan/commit/69ba4ace7aec46c858f07c44a45015eddb34e41a))



## [0.9.9](https://github.com/bitsocialnet/5chan/compare/v0.9.8...v0.9.9) (2026-06-28)


### Bug Fixes

* **boards-bar:** group /q/ with r9k, s5s, and vip in top bar ([afb3e31](https://github.com/bitsocialnet/5chan/commit/afb3e31f0a075713d3b3b16cb8dd1f4d137f3322))
* **markdown:** render code tags on code-enabled boards ([7258e21](https://github.com/bitsocialnet/5chan/commit/7258e21f6fc4d8f5b2c623534e47e3fd5a29931a))
* **post-content:** keep visited link colors on theme palette ([64dd30f](https://github.com/bitsocialnet/5chan/commit/64dd30ff2474f25e6b793555d386287f2a4dd1aa))
* **post-form:** enforce required post link board rules ([6b2b85f](https://github.com/bitsocialnet/5chan/commit/6b2b85f51e3f11386a4f8a4f1ee7cd79ee82327c))



## [0.9.8](https://github.com/bitsocialnet/5chan/compare/v0.9.7...v0.9.8) (2026-06-27)


### Bug Fixes

* **ai workflow:** align hook configs ([9e027a0](https://github.com/bitsocialnet/5chan/commit/9e027a01590ac7e38257e7df60d147737df45497))
* **catalog:** use search hashes for board routes ([ecb7f9e](https://github.com/bitsocialnet/5chan/commit/ecb7f9e4ccbb44db43b7bd972d3b2450d045b567))
* **edit-menu:** let moderators edit their own post content ([fa5320e](https://github.com/bitsocialnet/5chan/commit/fa5320e8347f0ed0793f8b2b11d4c6479ed206b5))
* **favicon:** show dedicated icon on 404 pages ([f213d41](https://github.com/bitsocialnet/5chan/commit/f213d412966c0ed055745d850686c0b1906f1ae7))
* **footer:** rename contact link to contributors ([292d3e3](https://github.com/bitsocialnet/5chan/commit/292d3e35a4771012caa145955c982c44388ea468))
* **media:** pause other videos when a new one starts playing ([24e340e](https://github.com/bitsocialnet/5chan/commit/24e340e4b6f4e5952f1c79e7b21ad1ef69c230da))
* **routing:** canonicalize board page 1 routes instead of not-found ([eacb422](https://github.com/bitsocialnet/5chan/commit/eacb422f405dae57f94c73ae52209c791b179330))


### Features

* **directories:** add /q/ feedback directory and link site footer ([51c0a16](https://github.com/bitsocialnet/5chan/commit/51c0a162494f79a908d395dfa81588b65454114a))



## [0.9.7](https://github.com/bitsocialnet/5chan/compare/v0.9.6...v0.9.7) (2026-06-26)


### Bug Fixes

* **post flags:** show flags on directory candidate boards ([8170cd1](https://github.com/bitsocialnet/5chan/commit/8170cd169d248408fed655a312d2d21362560cfb))



## [0.9.6](https://github.com/bitsocialnet/5chan/compare/v0.9.5...v0.9.6) (2026-06-25)


### Bug Fixes

* **board:** preserve feed order during hydration ([2ff7b8b](https://github.com/bitsocialnet/5chan/commit/2ff7b8bc8803100fdaf7d2d644f54cdc955eaa80))
* **media playback:** keep partially visible videos playing ([7fe3bd7](https://github.com/bitsocialnet/5chan/commit/7fe3bd791146d71ab7fb606fc47d00971987d722))



## [0.9.5](https://github.com/bitsocialnet/5chan/compare/v0.9.4...v0.9.5) (2026-06-25)


### Bug Fixes

* **account-data-editor:** restore Ace load ordering ([cb74ba8](https://github.com/bitsocialnet/5chan/commit/cb74ba803de69cacb76bfca8137f95a004a4f156))
* consume enriched account comments directly ([#1178](https://github.com/bitsocialnet/5chan/issues/1178)) ([f1022fc](https://github.com/bitsocialnet/5chan/commit/f1022fc2d929087f5ef2f6769a687de351fada72))
* **deps:** bump vulnerable transitive dependencies for Dependabot alerts ([7f193b4](https://github.com/bitsocialnet/5chan/commit/7f193b479b76de5d0f4c9bd06059db987fc0dd2a))
* **p2p:** stop account recovery reload loop ([5dd2d95](https://github.com/bitsocialnet/5chan/commit/5dd2d952136bfa29629ab879c02c91a879a15647))
* **publishing:** keep submit guard active until publish settles ([0426221](https://github.com/bitsocialnet/5chan/commit/04262214e1d7553ea93b4fbf77946f71242922a1))
* **replies:** hide no-reason removed replies ([4737d37](https://github.com/bitsocialnet/5chan/commit/4737d379672edb6d67ac453a356aec8a7b21e24e))
* **settings:** keep pubsub visibility stable before refresh ([ca5582c](https://github.com/bitsocialnet/5chan/commit/ca5582cffacb6ca62937480828446c294a902622))


### Features

* **p2p:** enable pure browser p2p by default ([fb00446](https://github.com/bitsocialnet/5chan/commit/fb004469e39ffba7d0a98679da710fc41c9355cd))



## [0.9.4](https://github.com/bitsocialnet/5chan/compare/v0.9.3...v0.9.4) (2026-06-18)


### Bug Fixes

* **electron:** add BSO name resolvers for desktop board address resolution ([3a4a0d4](https://github.com/bitsocialnet/5chan/commit/3a4a0d413085892ec64071bb41268514d2c109b6))
* **home:** point footer Blog link to bitsocial.net ([d2f058a](https://github.com/bitsocialnet/5chan/commit/d2f058a5ede54220384e4aa0efd8aeac7494ba54))
* **p2p:** disable browser pure P2P by default ([1c14003](https://github.com/bitsocialnet/5chan/commit/1c140035b46d7477272234169017e03e182aabb2))
* **post:** restore thread author controls after publish navigation ([6297edb](https://github.com/bitsocialnet/5chan/commit/6297edb49fdb7eba392a8165706b0ade47b84269))
* **posts:** hide stale initializing footer ([fb1a61e](https://github.com/bitsocialnet/5chan/commit/fb1a61eacea0efd8c2ce09ed4c51ecf93594ff45))
* **replies:** keep fresh replies scoped to thread ([#1174](https://github.com/bitsocialnet/5chan/issues/1174)) ([9896c44](https://github.com/bitsocialnet/5chan/commit/9896c4400bceab98575cfc4553c12665e05b4374))



## [0.9.3](https://github.com/bitsocialnet/5chan/compare/v0.9.2...v0.9.3) (2026-06-18)


### Bug Fixes

* **ci:** keep raw board tests side-effect free ([75dd7a8](https://github.com/bitsocialnet/5chan/commit/75dd7a84967cb3c99da37780fb31bb6a947d7d57))
* **pubsub:** avoid false browser p2p provider failures ([10015de](https://github.com/bitsocialnet/5chan/commit/10015de6b925595694ce1abae547e628b169bf35))
* **pubsub:** repair browser pure p2p publishing ([8cf03a7](https://github.com/bitsocialnet/5chan/commit/8cf03a7bb4951d115de101ba847d7b9de9253a3a))
* **pubsub:** restore browser pure p2p publishing ([1278cf4](https://github.com/bitsocialnet/5chan/commit/1278cf42c00446ae85add65722b74caacee78ce3))
* **release:** align blotter and release copy with LaTeX in /sci/ ([3577673](https://github.com/bitsocialnet/5chan/commit/35776737f2479266c00fffc440e4b946e5782517))
* **rules:** re-scroll directory hash when data refreshes ([6006a65](https://github.com/bitsocialnet/5chan/commit/6006a658fbf4fe625a76c836992dff89540dbe4a))


### Performance Improvements

* **mod queue:** stabilize empty loading state ([33bb1d1](https://github.com/bitsocialnet/5chan/commit/33bb1d1356fbf09693acb5003bcc6e7039a51b90))
* **mod queue:** stabilize moderation subscriptions ([f3565f0](https://github.com/bitsocialnet/5chan/commit/f3565f0dda132c67300c49eba49e868f2fc6bfbd))



## [0.9.2](https://github.com/bitsocialnet/5chan/compare/v0.9.1...v0.9.2) (2026-06-13)


### Bug Fixes

* **archive:** preserve button link text color on desktop ([b0193b3](https://github.com/bitsocialnet/5chan/commit/b0193b34beec9993d4ca3cedc259ac2e9bd88460))
* **challenge-modal:** center mobile modal in viewport ([2e58961](https://github.com/bitsocialnet/5chan/commit/2e58961cf1d32fa303c042809309172add45eb51))
* **challenge-modal:** publish challenge answers with pkc object schema ([591aaa7](https://github.com/bitsocialnet/5chan/commit/591aaa729f05a4b2ff62b86c07ee67c112f4123b))
* **deps:** bump react-router-dom to 6.30.4 ([ee5aa78](https://github.com/bitsocialnet/5chan/commit/ee5aa7845edcd66b4bde7d6b09a6018bf40b9974)), closes [#276](https://github.com/bitsocialnet/5chan/issues/276)
* **deps:** resolve shell-quote critical dependabot alert ([fa7cab0](https://github.com/bitsocialnet/5chan/commit/fa7cab069999c745595d2d50bd4f9c920047963d))
* **failed-publish:** keep bracket actions on one line ([9de2e6a](https://github.com/bitsocialnet/5chan/commit/9de2e6a8510d4ec6647ff13ce99bd9e8c22b197a))
* **flags:** limit challenge requests to country flags ([32dbabb](https://github.com/bitsocialnet/5chan/commit/32dbabb7c73052adf56b71686662abd95f35d1cc))
* **flags:** map pony flags to sprite sheet coordinates ([cbdd4ed](https://github.com/bitsocialnet/5chan/commit/cbdd4edf7b875198c59a3a8bf95442f1482bd3bc))
* **media playback:** stop hidden and offscreen media ([#1164](https://github.com/bitsocialnet/5chan/issues/1164)) ([245d316](https://github.com/bitsocialnet/5chan/commit/245d3164c34a8dc55dd11f2ffed92b74a089e2ba))
* **mod queue:** reset board filter on navigation ([#1166](https://github.com/bitsocialnet/5chan/issues/1166)) ([a3ff6b2](https://github.com/bitsocialnet/5chan/commit/a3ff6b2e334eb9e9af4b140a4c2be325cf7791cd))
* **mod-queue:** show empty state instead of not-allowed redirect ([4308d26](https://github.com/bitsocialnet/5chan/commit/4308d26cf0120024efce857c0037e35964da4b86))
* **pending-post:** keep retrying failed posts on the pending route ([#1161](https://github.com/bitsocialnet/5chan/issues/1161)) ([bd12b47](https://github.com/bitsocialnet/5chan/commit/bd12b47db61ed76ec56320057a85f5f5630b88b7))
* **post ids:** avoid cid fallback for poster identity ([cdb1d13](https://github.com/bitsocialnet/5chan/commit/cdb1d13bef6e369108e0abc344ed8bcc8746eadd))
* **post ids:** fall back to comment cid for missing ids ([#1167](https://github.com/bitsocialnet/5chan/issues/1167)) ([c0f1a77](https://github.com/bitsocialnet/5chan/commit/c0f1a77958a344b2d5b83a1fd8ebb3a271cf8b39))
* **post-form:** convert twimg query-format links in the reply modal ([#1168](https://github.com/bitsocialnet/5chan/issues/1168)) ([2f938d5](https://github.com/bitsocialnet/5chan/commit/2f938d59ae5778c3569feb1cc34f7128af4a4ed2))
* **post-form:** hide filename for non-file media links ([27558de](https://github.com/bitsocialnet/5chan/commit/27558ded182c38695e1ed9c3b2bc81328c31233e))
* **post-form:** style errors like 4chan and move into tfoot ([f3d59c3](https://github.com/bitsocialnet/5chan/commit/f3d59c3345103d87797d81d752be41300c623206))
* **reply-modal:** blur TeX button when preview closes ([8456295](https://github.com/bitsocialnet/5chan/commit/8456295eee0ddbb1f1663a127252d4f31acb1f75))
* resolve open Dependabot security alerts ([43b160b](https://github.com/bitsocialnet/5chan/commit/43b160b1fcfe54e3f2aa769f8207d0d9697d2d9a))
* **rules:** use hash links for directory deep links ([e9c729a](https://github.com/bitsocialnet/5chan/commit/e9c729a9e3bfe852fe0c88b856b10fbdba3dc9a4))
* **thread update:** refresh stale reply caches ([#1160](https://github.com/bitsocialnet/5chan/issues/1160)) ([c2b222c](https://github.com/bitsocialnet/5chan/commit/c2b222c4d50ce10e74f135a8f3afbb758b78e33f))
* **thread:** show optimistic reply count after publishing own reply ([#1162](https://github.com/bitsocialnet/5chan/issues/1162)) ([182ff0e](https://github.com/bitsocialnet/5chan/commit/182ff0eadc9568fb06a9ac6ee24ec214c41ce7b0))
* **youtube thumbnails:** prefer best available image ([6cb28b0](https://github.com/bitsocialnet/5chan/commit/6cb28b0e4f03505a59ade1585ff96d2b1bcf5beb))


### Features

* **board-header:** show subtitle on /all view ([dcc47c7](https://github.com/bitsocialnet/5chan/commit/dcc47c7bbdbef6f1a93613d4c62c90e7656dc098))
* **electron:** sign and notarize mac release builds ([#1171](https://github.com/bitsocialnet/5chan/issues/1171)) ([85b782e](https://github.com/bitsocialnet/5chan/commit/85b782e9349cd8683a350db44b731744c30af17f)), closes [electron/notarize#245](https://github.com/electron/notarize/issues/245)
* **reply modal:** add sci tex preview button ([#1170](https://github.com/bitsocialnet/5chan/issues/1170)) ([17c63bb](https://github.com/bitsocialnet/5chan/commit/17c63bb2e6187901265b13b56126c724e7acac0a))
* **settings:** internationalize advanced settings and update RPC label to .bso ([6d9b5ff](https://github.com/bitsocialnet/5chan/commit/6d9b5ff3ce465c53370d12f6763a65bb90202848))



## [0.9.1](https://github.com/bitsocialnet/5chan/compare/v0.9.0...v0.9.1) (2026-06-07)


### Bug Fixes

* **board-buttons:** hide catalog controls on flash upload boards ([b686def](https://github.com/bitsocialnet/5chan/commit/b686def1a1fd6e35a06aea47622cda0b76e3d208))
* **board:** prevent transient no threads state ([#1151](https://github.com/bitsocialnet/5chan/issues/1151)) ([608402b](https://github.com/bitsocialnet/5chan/commit/608402b5c8bffa2da756896a0651393469853174))
* **challenge modal:** stop drag position snapback on re-render ([0ee3fb0](https://github.com/bitsocialnet/5chan/commit/0ee3fb00bd5a4aca7d2496c120f209d42a3271d5))
* **comment-content:** render reason text as comment content ([d3b5c40](https://github.com/bitsocialnet/5chan/commit/d3b5c40321667b81e7c05f0ec016c73276e37341))
* default fit expanded images to screen on ([e47750e](https://github.com/bitsocialnet/5chan/commit/e47750edf8aef116d977a63b5be236281f727849))
* default mod queue to feed view ([40bafa2](https://github.com/bitsocialnet/5chan/commit/40bafa2a0fddb619be2bbc555757e0ec754a1460))
* **edit menu:** read canonical author bans ([38d18b1](https://github.com/bitsocialnet/5chan/commit/38d18b141ee3383437c81f012cbd148dd696a5e8))
* **embed:** restore youtube thumbnails and file-row labels ([#1148](https://github.com/bitsocialnet/5chan/issues/1148)) ([829b672](https://github.com/bitsocialnet/5chan/commit/829b6720533e7c41f3712d5299f0dfa42f9888f8))
* **faq:** scroll direct hash links ([72aca22](https://github.com/bitsocialnet/5chan/commit/72aca22723fbbac739daa58ea02fc6d75440e285))
* **flags:** hide geolocation-only selectors on /int/ and /sp/ ([1bd8d6d](https://github.com/bitsocialnet/5chan/commit/1bd8d6dc349ad6695648f9d145145ce9b01df64f))
* **flags:** label Tor country flag ([0f6d745](https://github.com/bitsocialnet/5chan/commit/0f6d74592ec1aa2ce8353347889dc50062a15101))
* **flags:** resolve comment flags from directory list candidates ([4cc2bf4](https://github.com/bitsocialnet/5chan/commit/4cc2bf4ea1b4296d88bc021d464e90cc3de431ef))
* **fortune:** scope s5s fortune markup ([#1150](https://github.com/bitsocialnet/5chan/issues/1150)) ([d09d2d0](https://github.com/bitsocialnet/5chan/commit/d09d2d05d19ea5f8952d27ee4f025c4f995bd39f))
* **markdown:** render moderation reason links ([54f2cf2](https://github.com/bitsocialnet/5chan/commit/54f2cf2b84386179e085be51adc209878d2e7a84))
* **mod queue:** show pending approval reasons directly ([be2b774](https://github.com/bitsocialnet/5chan/commit/be2b774382cd64cf1717b922a9602fc3e0fffe5d))
* **mod-queue:** rework excerpt hover preview, scope pending-age alerts ([#1152](https://github.com/bitsocialnet/5chan/issues/1152)) ([12977fa](https://github.com/bitsocialnet/5chan/commit/12977fa24a396e900d79b968b527cf790b313e4a))
* **p2p-stats:** show peer flags for DNS6 relay hostnames ([3480dc0](https://github.com/bitsocialnet/5chan/commit/3480dc0505484a285e5fff98fc429f57aafcc3ed))
* **post form:** publish twimg query-format links with path extension ([3ece699](https://github.com/bitsocialnet/5chan/commit/3ece699a6ff583cbd51c138f16b241f318b9e2b1))
* **post form:** reject non-media file links ([95f3a54](https://github.com/bitsocialnet/5chan/commit/95f3a54b9deb2e35143fe16de2fc049ebce2dee9))
* **post options:** link sage warning to FAQ ([75c805c](https://github.com/bitsocialnet/5chan/commit/75c805c8224aec73679cd90c9fe6bb5c3e11bf0e))
* **post-form:** auto-convert YouTube links to thumbnail URLs ([0a601c9](https://github.com/bitsocialnet/5chan/commit/0a601c9392572430e3206b5dfa3de72e17fb1db9))
* **post-form:** restore native board selector appearance ([a7cd3ac](https://github.com/bitsocialnet/5chan/commit/a7cd3ac87f5cb4499f849eabf9db2338858bc989))
* **post-form:** use native browser styling for flash tag select ([872116b](https://github.com/bitsocialnet/5chan/commit/872116b13214ad2733097a3c42c6f72728e009fd))
* **post:** show specific role in moderation posting warning ([812b6bc](https://github.com/bitsocialnet/5chan/commit/812b6bc79c6a6c1fd815f482ff861e4eca70cf77))
* **quotes:** handle cross-thread quotes (publish + hover preview) ([#1153](https://github.com/bitsocialnet/5chan/issues/1153)) ([69ee157](https://github.com/bitsocialnet/5chan/commit/69ee15786b9a4f09914089727eb2e7853bef95b2))
* **react-doctor:** correct test exclusion + React-Compiler lint policy + state-sync fix ([#1155](https://github.com/bitsocialnet/5chan/issues/1155)) ([0493492](https://github.com/bitsocialnet/5chan/commit/0493492f55b626d64eb1ba39ce98a272a5c7fd32))
* **theme:** prevent default theme flash on hard refresh ([bdbe44a](https://github.com/bitsocialnet/5chan/commit/bdbe44aa905681a4db5b8469527b34b2afe9ba6c))
* use body color for brackets around inline action buttons ([bc67e96](https://github.com/bitsocialnet/5chan/commit/bc67e961fc0da8ae402b684dbd0a2ff5b119291c))


### Features

* **directory:** add submit board link ([04af198](https://github.com/bitsocialnet/5chan/commit/04af1981400c90a6bb63710880c3f581015983d1))
* **home stats:** load stats progressively ([d357514](https://github.com/bitsocialnet/5chan/commit/d35751439772d48c31ca12bcf6e823723f4204f5))
* **markdown:** add /g/ [code] tag syntax highlighting ([ae16ae3](https://github.com/bitsocialnet/5chan/commit/ae16ae3dd3d9bddc62384854d304facdfc2fc396))
* use s.5chan.app share links and remove report menu items ([404a464](https://github.com/bitsocialnet/5chan/commit/404a464310c82df1a39a9bf7568aeb2db915fd68))



# [0.9.0](https://github.com/bitsocialnet/5chan/compare/v0.8.5...v0.9.0) (2026-05-31)


### Bug Fixes

* **advanced settings:** hide gateway fields in pure p2p mode and align inputs ([b849f7c](https://github.com/bitsocialnet/5chan/commit/b849f7c3765c0ec31e182d4b4842c25ae708114a))
* **app:** preserve post form drafts in settings ([f39ad09](https://github.com/bitsocialnet/5chan/commit/f39ad096b7506a18ff0d42e05a689a43251ab775))
* **archive:** fix layout ([3e4737f](https://github.com/bitsocialnet/5chan/commit/3e4737fe9762aa4acdde4f7967f34507e1fea454))
* **board header:** replace loading icon with spinner ([0df81b5](https://github.com/bitsocialnet/5chan/commit/0df81b598eb89e155fff24e73e13da39441c7402))
* **board-pagination:** increase footer pagelist padding ([55bb873](https://github.com/bitsocialnet/5chan/commit/55bb873ab1901a9fb68122ab59caab2936b0963b))
* **board:** clarify loading fallback ([e426bf2](https://github.com/bitsocialnet/5chan/commit/e426bf2ccc57824c0f762ca40335e0bc9b0d3ed6))
* **board:** hide feed footer on flash table ([08ebdce](https://github.com/bitsocialnet/5chan/commit/08ebdce29cb1f047efbaa3ad75cd101173e6a85c))
* **board:** match subscriptions empty state to catalog search styling ([77e4650](https://github.com/bitsocialnet/5chan/commit/77e46500e215e91d2861851a31ffdb42334816a7))
* **boards:** use ROBOT9002 board name in directory list ([d9c040d](https://github.com/bitsocialnet/5chan/commit/d9c040d5f7567b18eda81983eeaff60e58e0c276))
* **board:** warn on unverified addresses ([a31c3b4](https://github.com/bitsocialnet/5chan/commit/a31c3b44d3c17c778d6b01addc67e392b7d74a18))
* **catalog:** improve empty search state and footer layout ([62cff4e](https://github.com/bitsocialnet/5chan/commit/62cff4e2070249d6f50a329fce8f8701c5d2a4ec))
* **challenge modal:** rename iframe completion button ([5cfcd8b](https://github.com/bitsocialnet/5chan/commit/5cfcd8ba04dfd3c8cc1e894fcda478c40690482d))
* **deps:** bump resolutions for Dependabot security alerts ([7fcea5d](https://github.com/bitsocialnet/5chan/commit/7fcea5d370c3ffdbc524a75ae9b39812340e9b33))
* **directory:** load direct board routes ([35ffbd2](https://github.com/bitsocialnet/5chan/commit/35ffbd257bb06ff2eaa9930a3c4ae4d3e1304e58))
* **directory:** load per-directory list files ([#1134](https://github.com/bitsocialnet/5chan/issues/1134)) ([536d9ac](https://github.com/bitsocialnet/5chan/commit/536d9ac0b8886f952d06dd83e7ee83f1fae629a8))
* **directory:** restore table header styling ([d21f91a](https://github.com/bitsocialnet/5chan/commit/d21f91a1714cfd1b485ef641bedfd632cad4351a))
* **directory:** use resolved board for directory feeds ([616fea3](https://github.com/bitsocialnet/5chan/commit/616fea39fbc0de79973489ce66fe8bdac46c2648))
* **edit menu:** restore moderation reason field ([99eb49c](https://github.com/bitsocialnet/5chan/commit/99eb49cdc5c711aaef2d5b79a47fd2d4da797a06))
* **feed:** clarify loading states ([a6a1320](https://github.com/bitsocialnet/5chan/commit/a6a1320381724353655475a1258414dbd949d5f2))
* **flags:** align board flag rendering ([#1142](https://github.com/bitsocialnet/5chan/issues/1142)) ([0299390](https://github.com/bitsocialnet/5chan/commit/029939089f59ef5a20f4f89cb6ec44af1f7fb138))
* **flags:** move reply flag below link and auto-geo on /bant/ ([633542a](https://github.com/bitsocialnet/5chan/commit/633542a1f77f126b0ff692b038766d0fa48a5509))
* **home:** keep stats loading until directories resolve ([c3d5320](https://github.com/bitsocialnet/5chan/commit/c3d53202a35f9d4ab07391f7c8c81c1992ad5e80))
* **home:** route support link to pass page ([e58a101](https://github.com/bitsocialnet/5chan/commit/e58a10149f2c6b250cb57bb8aa43a73b104d96ae))
* **home:** unify stats loading state with feed status string ([a435d93](https://github.com/bitsocialnet/5chan/commit/a435d93c8ae964daab01416f9961a4f57b84ddce))
* **home:** use directory fallbacks for stats ([#1133](https://github.com/bitsocialnet/5chan/issues/1133)) ([6a7df90](https://github.com/bitsocialnet/5chan/commit/6a7df90129040a53644d5a273b5ca474324074d3))
* **i18n:** disable i18next Locize support notice ([c220c62](https://github.com/bitsocialnet/5chan/commit/c220c62b82883228e3683e71cda7f7eeb5d927fb))
* **media:** embed additional direct image formats ([#1146](https://github.com/bitsocialnet/5chan/issues/1146)) ([e4638ac](https://github.com/bitsocialnet/5chan/commit/e4638ac8c7b9e8b9c64a54d6811b65750d33093a))
* **mod multiboard:** show account import empty state ([56c4fdf](https://github.com/bitsocialnet/5chan/commit/56c4fdf3c1943828449324f9bded5ffaead39de2))
* **mod queue:** dedupe board filters ([d13f224](https://github.com/bitsocialnet/5chan/commit/d13f2240e3edd3532fdc90f2e5a4f92ab9f17dd9))
* **mod queue:** keep empty state inside loaded table ([ff732af](https://github.com/bitsocialnet/5chan/commit/ff732af9de182fd88829bd97b41413d12c1b28e1))
* **mod queue:** rename queue dismissal action ([ca6e843](https://github.com/bitsocialnet/5chan/commit/ca6e843a89dc4da8579a5413940c6c9327e0b22f))
* **moderation:** clarify moderator composer state ([275d8b0](https://github.com/bitsocialnet/5chan/commit/275d8b0e69d78b5980fc25a0af3268da651f446e))
* **p2p stats:** improve own-IP geolocation and world map accuracy ([#1138](https://github.com/bitsocialnet/5chan/issues/1138)) ([f503928](https://github.com/bitsocialnet/5chan/commit/f5039285a731903cf72fc561fa820db099131a37))
* **p2p stats:** prefer browser IPv4 for own endpoint ([639c627](https://github.com/bitsocialnet/5chan/commit/639c627a04059f7df5d4c827bcda4a31aa7f1750))
* **p2p stats:** show peer transfer counters ([a40b446](https://github.com/bitsocialnet/5chan/commit/a40b446f141c213d9b8aa45e64a7c007f0573dc6))
* **p2p-stats:** center loading state and add animated ellipsis ([680dd71](https://github.com/bitsocialnet/5chan/commit/680dd712856fdc3ef2427d175228eb04be1545ea))
* **pending-post:** preserve sparse retry routes ([e0a42e7](https://github.com/bitsocialnet/5chan/commit/e0a42e7899a20143f9d25429cd7c034bd9c3d3e4))
* **pending-post:** return to board after abandoned challenge ([e95dcb8](https://github.com/bitsocialnet/5chan/commit/e95dcb8af572e5af0d2a9fdcf96d9841479f3c4a))
* **post form:** align desktop post form to blotter left edge ([b347205](https://github.com/bitsocialnet/5chan/commit/b3472051365462cd305c3da0f6964cd268bb4df3))
* **post form:** align rules prompt test with bottom placement ([#1136](https://github.com/bitsocialnet/5chan/issues/1136)) ([4c011b3](https://github.com/bitsocialnet/5chan/commit/4c011b3fdd81707629254637096a7ccb82b8e971))
* **post form:** block temporary media links ([a86c523](https://github.com/bitsocialnet/5chan/commit/a86c523d178c337db379907fff0c6fc573fb0275))
* **post form:** center the collapsed start-new-thread toggle ([8cd3b65](https://github.com/bitsocialnet/5chan/commit/8cd3b65b19cd2dbefee0698581d82da7609ffca6))
* **post form:** move rules and FAQ prompt to bottom of form ([4efa668](https://github.com/bitsocialnet/5chan/commit/4efa668fec4866b84b4af052a186f4363008614a))
* **post form:** show validation errors inline ([4acd444](https://github.com/bitsocialnet/5chan/commit/4acd4449ea3d725651cf5ca890561205d2bc7ebc))
* **post-form:** clear stale draft state on form remount ([#1131](https://github.com/bitsocialnet/5chan/issues/1131)) ([95f3faf](https://github.com/bitsocialnet/5chan/commit/95f3faf31ab58d7f0dfb149ebd93f1d2d4a2a08f))
* **post-form:** shorten long uploaded file labels in the form ([75d90c8](https://github.com/bitsocialnet/5chan/commit/75d90c826415aa85f7348b6bb2b28621e4cd29a3))
* **post:** link board-specific option errors to supported boards ([5fad3c7](https://github.com/bitsocialnet/5chan/commit/5fad3c73ba3346730680de6f2696ec4288a0a7cc))
* **react:** address Doctor findings ([#1143](https://github.com/bitsocialnet/5chan/issues/1143)) ([e082c7b](https://github.com/bitsocialnet/5chan/commit/e082c7b4286ba2c073520ec2b56c53903a2643ce))
* **reply modal:** wrap search status text ([30f395c](https://github.com/bitsocialnet/5chan/commit/30f395c1c826710b9323d3c07d41bf97469cf720))
* **rules:** show friendly loading state string for board rules ([30dde09](https://github.com/bitsocialnet/5chan/commit/30dde0944df571650cd2b294108b1d4fed7c9b74))
* **settings:** clarify pure p2p gateway copy ([c8edc92](https://github.com/bitsocialnet/5chan/commit/c8edc92983756667332b7d8429a411a53080b55e))
* **settings:** show crypto address validation inline instead of alert ([1a57ec4](https://github.com/bitsocialnet/5chan/commit/1a57ec44b15686f2b01c29106d3ed663de36663e))
* **theme:** match tomorrow directory/archive table headers to 4chan ([693c8ad](https://github.com/bitsocialnet/5chan/commit/693c8ad360c9d6288cc28f1e10fb29416e46c008))
* **thread:** pass board identity to comments ([70cf337](https://github.com/bitsocialnet/5chan/commit/70cf337895a4cd00aa4c4aeda7f1bde05cf70639))
* **ui:** hardcode /all/ and /mod/ multiboard titles ([df0936a](https://github.com/bitsocialnet/5chan/commit/df0936a4f9115aa6e0a55e32b2f136dbed13769e))
* **ui:** position disclaimer and directory modals 50px from top ([b983cfd](https://github.com/bitsocialnet/5chan/commit/b983cfdce4c1e4589ce8472cf1fee28ce70d12b0))
* **ui:** use native browser styling for flag select ([2030b8c](https://github.com/bitsocialnet/5chan/commit/2030b8c5bb5814645cbb8b6a8407aa443c6eb427))


### Features

* **flags:** add comment flags ([#1140](https://github.com/bitsocialnet/5chan/issues/1140)) ([f74b33f](https://github.com/bitsocialnet/5chan/commit/f74b33f43b138de8d88d113900579ae0327ff138))
* **flash board:** add SWF posting support ([#1145](https://github.com/bitsocialnet/5chan/issues/1145)) ([9b3a95d](https://github.com/bitsocialnet/5chan/commit/9b3a95dd95b5b85e4ee40ad0826162ca4b87d31d))
* **oekaki:** add drawing flow for /i/ ([#1144](https://github.com/bitsocialnet/5chan/issues/1144)) ([5689470](https://github.com/bitsocialnet/5chan/commit/56894700c1321ed6c34cb693fcd785b3c6fbfdfe))
* **p2p stats:** redesign connected peers with world map and country flags ([782a1f4](https://github.com/bitsocialnet/5chan/commit/782a1f466f03842f76e773f8f6ded64528d42827))
* **p2p:** enable pure browser p2p by default ([ca13e97](https://github.com/bitsocialnet/5chan/commit/ca13e97dd490fe5b2c56ad3c5de76848308ab4a6))
* **post form:** add rules and FAQ prompt ([7305e40](https://github.com/bitsocialnet/5chan/commit/7305e4087013f5d94251b71d54c00b69fa131037))
* **post options:** support nonoko board redirects ([#1137](https://github.com/bitsocialnet/5chan/issues/1137)) ([22c1b4f](https://github.com/bitsocialnet/5chan/commit/22c1b4f1233a3b3f0219e1154136a8a961782d50))
* **posting:** add scoped options and qst formatting ([#1135](https://github.com/bitsocialnet/5chan/issues/1135)) ([ff6b4cd](https://github.com/bitsocialnet/5chan/commit/ff6b4cd201adc0fd90c04ee891d5272458b227ed))
* **posts:** add mod bbcode editor ([d2d047e](https://github.com/bitsocialnet/5chan/commit/d2d047e5de779142c0a714a42768860fad8462e4))
* **post:** show pending approval reason ([348e339](https://github.com/bitsocialnet/5chan/commit/348e3393c72b50c8420bc73a5dd8bab5052e88e0))
* **rules page:** rebuild directory rules page with vendored lists ([#1147](https://github.com/bitsocialnet/5chan/issues/1147)) ([b442e05](https://github.com/bitsocialnet/5chan/commit/b442e05191780f80b52f7da80e02719ccf43fe0d))
* **theme:** add halloween special theme ([0469f61](https://github.com/bitsocialnet/5chan/commit/0469f61a45d891e124dac6c44828b29f3faf3fff))


### Performance Improvements

* **dev startup:** skip remote release tag lookup ([7ba8985](https://github.com/bitsocialnet/5chan/commit/7ba8985a02d4ebc06d544e2da70218ccde174bf7))



## [0.8.5](https://github.com/bitsocialnet/5chan/compare/v0.8.4...v0.8.5) (2026-05-15)


### Bug Fixes

* **blotter:** render on multiboard feeds ([918ed5b](https://github.com/bitsocialnet/5chan/commit/918ed5b11b0ef7c2a982725077575d91853ed0f0))
* **boards bar:** preserve catalog multiboard links ([29f5e67](https://github.com/bitsocialnet/5chan/commit/29f5e67c723175acd449ecb78f9cbd384513f9b4))
* **catalog:** hide threads across board catalogs ([8217bad](https://github.com/bitsocialnet/5chan/commit/8217bad7357903095142c6dce64a770f7f7f3b4c))
* **deps:** update vulnerable transitive dependencies ([c40353d](https://github.com/bitsocialnet/5chan/commit/c40353d2e615335acb11054a3f1a5e9de7622541))
* **desktop:** start PKC RPC with configured options ([9f2a95a](https://github.com/bitsocialnet/5chan/commit/9f2a95af50f4f4935e57de02618fc33d8b32778d))
* **dev server:** route HMR through Portless ([f008e82](https://github.com/bitsocialnet/5chan/commit/f008e82539a71019abf9306824fa397c33d3a92e))
* **electron:** use bundled Chromium version in user agent ([8486401](https://github.com/bitsocialnet/5chan/commit/84864019f579b54eb6e58c9215ae0fbb1d4f589e))
* **favicon:** add touch and search icons ([69008df](https://github.com/bitsocialnet/5chan/commit/69008dfd818cabcc99fae47f85c49aad9186e984))
* **footer:** use link color for legal metadata ([2adb4bb](https://github.com/bitsocialnet/5chan/commit/2adb4bb88ce178c607e403a1a509aecebf94cca1))
* **media:** clarify failed external image embeds ([fe87808](https://github.com/bitsocialnet/5chan/commit/fe87808a9004279c94219ac1bcabce03b6c6a154))
* **mod queue:** align mobile remove button styling ([36ecad6](https://github.com/bitsocialnet/5chan/commit/36ecad640d5d02938de756397408820f91a3a9e0))
* **mod queue:** keep error details out of visible text ([a4e058c](https://github.com/bitsocialnet/5chan/commit/a4e058c6ac313135903caf7613874400d0a88b7f))
* **mod queue:** stop resurfacing stale pending history ([#1130](https://github.com/bitsocialnet/5chan/issues/1130)) ([a6f6e42](https://github.com/bitsocialnet/5chan/commit/a6f6e42bd7daeb2caf05bb79d468d98f25837f10))
* **p2p stats:** clarify browser peer data ([8cb632f](https://github.com/bitsocialnet/5chan/commit/8cb632f3dbe18a90810e3231c25dcd9996cde864))
* **p2p:** force browser mode on p2p subdomains ([a97b891](https://github.com/bitsocialnet/5chan/commit/a97b891c5f1645f067f70757102bfe1713544bc0))
* **pass:** preserve heading casing ([3767923](https://github.com/bitsocialnet/5chan/commit/3767923556f5d0265bfce9284fef7c36281e18d2))
* **settings:** show latest update feedback ([c8640a8](https://github.com/bitsocialnet/5chan/commit/c8640a801000094116ec3f0bf71e70e24ef7468c))


### Features

* **author badges:** add 5chan developer badges ([9f6c073](https://github.com/bitsocialnet/5chan/commit/9f6c07326478d8cfb82f1acd675c28a9da91bb01))



## [0.8.4](https://github.com/bitsocialnet/5chan/compare/v0.8.3...v0.8.4) (2026-05-11)


### Bug Fixes

* **account settings:** activate imported account ([4f1b4d9](https://github.com/bitsocialnet/5chan/commit/4f1b4d96776d51792a2c73358176af97a7fe2151))
* **deps:** update vulnerable transitive dependencies ([529e8ed](https://github.com/bitsocialnet/5chan/commit/529e8ed48fc9dbfed90949f01feb02855cacc57d))
* **embed:** restore x status embeds ([5187938](https://github.com/bitsocialnet/5chan/commit/5187938dc656020dfe1289ea1e5ec6274d4e9fe7))
* **faq:** scope visited link color to content ([a860859](https://github.com/bitsocialnet/5chan/commit/a860859507cc163bb4d2c4a872582b13d01485c5))
* **markdown:** allow repeated greentext markers ([719005e](https://github.com/bitsocialnet/5chan/commit/719005e9355ea2bbdcf1ca70d074b41342006754))
* **media:** classify mp4-formatted gif previews as video ([36bb1f7](https://github.com/bitsocialnet/5chan/commit/36bb1f726d43f6e21681fbe43f0d456654e3e29f))
* remove Android self-install updater ([#1125](https://github.com/bitsocialnet/5chan/issues/1125)) ([aaa0d88](https://github.com/bitsocialnet/5chan/commit/aaa0d88d6aebbb7ec21c5c4c4d0eb6a3c3269259))
* **settings:** move pure p2p toggle below fields ([cbc5088](https://github.com/bitsocialnet/5chan/commit/cbc50888d5dfe38fe57727c4cdfee11fda19922d))
* **settings:** remove Solana RPC advanced option ([a88c2e5](https://github.com/bitsocialnet/5chan/commit/a88c2e50f515dce36d814ee78b8506f9e7fad1d3))
* **state string:** shorten browser p2p loading text ([055ead8](https://github.com/bitsocialnet/5chan/commit/055ead84b6cb0e28b4c17edb96c7d0063ea1b5d0))
* **themes:** restore classic topbar separators ([77dd0e9](https://github.com/bitsocialnet/5chan/commit/77dd0e9b6392b81faa3a0c382acc64c02afeb26e))


### Features

* **challenge modal:** remember trusted board websites ([cb05a8b](https://github.com/bitsocialnet/5chan/commit/cb05a8b9057fb915c27ff114e3b849d38bd9a936))
* **p2p settings:** add browser p2p stats ([14a4790](https://github.com/bitsocialnet/5chan/commit/14a4790c8b4118427d83bad650b07ef18f04b6fb))
* **version:** show unreleased commit label ([#1126](https://github.com/bitsocialnet/5chan/issues/1126)) ([2b2c517](https://github.com/bitsocialnet/5chan/commit/2b2c517c598b4425f71be46e66020b47828c0807))


### Performance Improvements

* **directories:** dedupe refreshes across hook mounts ([5fe6537](https://github.com/bitsocialnet/5chan/commit/5fe653726dc12ae9eb7480cc9fed1574991cb2fe))



## [0.8.3](https://github.com/bitsocialnet/5chan/compare/v0.8.2...v0.8.3) (2026-05-01)


### Bug Fixes

* **android upload:** handle transient imgur errors ([3de8552](https://github.com/bitsocialnet/5chan/commit/3de85520bdf8e0666314aa5da50d89c83abc0183))
* **android upload:** restore provider uploads ([e2154b3](https://github.com/bitsocialnet/5chan/commit/e2154b3edf9c57491d41c0c027d0970d75f8fe51))
* **android:** stop intercepting app fetches ([24619ac](https://github.com/bitsocialnet/5chan/commit/24619ac02f3f0616f240ef2ffb6d3dc43b3ab98d))
* **challenge modal:** avoid native iframe consent on WebKit ([0180c4e](https://github.com/bitsocialnet/5chan/commit/0180c4e59f0e8313d291009318e94a0ed36dbb54))
* **comment content:** hide detailed publish errors ([f4f1458](https://github.com/bitsocialnet/5chan/commit/f4f14583c6207bc470838cded27483f36c168b46))
* **faq:** keep visited links blue ([0cbae87](https://github.com/bitsocialnet/5chan/commit/0cbae87aef2b8e3d851a54ae85e85beed94cb83c))
* **media hosting:** restore android imgur support ([9f38869](https://github.com/bitsocialnet/5chan/commit/9f388693eb2291ab5b9671edb97c86601e393416))
* **posting:** clarify direct file links ([bc213ec](https://github.com/bitsocialnet/5chan/commit/bc213ecea26fa65bd59767f6bba6090b1b9fb843))
* **upload:** animate uploading ellipsis ([70791fa](https://github.com/bitsocialnet/5chan/commit/70791fa80a45d615051a991b6ee1c5deafceceff))


### Features

* **media hosting:** add imgbb provider ([78e5d58](https://github.com/bitsocialnet/5chan/commit/78e5d58d08457f1835106eb7687c5f9b0f249dc4))
* **media hosting:** disable unreachable providers ([7e1513b](https://github.com/bitsocialnet/5chan/commit/7e1513b6884c1d80fd28c054356e3bed60ad4606))



## [0.8.2](https://github.com/bitsocialnet/5chan/compare/v0.8.1...v0.8.2) (2026-04-30)


### Bug Fixes

* **challenge modal:** open iframe consent directly ([897e170](https://github.com/bitsocialnet/5chan/commit/897e17048515966467d73c3ed81b274fcc6f6a07))
* **home:** preserve popular thread preview markers ([c7b5f6e](https://github.com/bitsocialnet/5chan/commit/c7b5f6e2c50db1d3c0874911cef11d30ceaae416))
* **pending posts:** clean up failed post display ([5c74a1e](https://github.com/bitsocialnet/5chan/commit/5c74a1e495ba12c2f896bbb1cc89fe5654a7436d))



## [0.8.1](https://github.com/bitsocialnet/5chan/compare/v0.8.0...v0.8.1) (2026-04-29)


### Bug Fixes

* **archive:** animate loading ellipsis ([042f2df](https://github.com/bitsocialnet/5chan/commit/042f2df2234c3522c35e95e4e7fe4c06ecd5af09))
* **catalog:** preserve literal preview markers ([fd26d6f](https://github.com/bitsocialnet/5chan/commit/fd26d6fd102256674b3a65b8780e4705db501b18))
* **codebase audit:** preserve cleanup without regressions ([5dc5408](https://github.com/bitsocialnet/5chan/commit/5dc5408a15b5302ff20a43fd39686c19411b67af))
* **csp:** keep index html line endings stable ([e988a6e](https://github.com/bitsocialnet/5chan/commit/e988a6e8ad0ca2b4b9b50a9d8b7e39e1a5e526dd))
* **deps:** resolve Dependabot alerts ([0366a16](https://github.com/bitsocialnet/5chan/commit/0366a168441c934cdaaa7720747e3f0167a6379d))
* **feed:** measure expanded reply media height ([b0b5d45](https://github.com/bitsocialnet/5chan/commit/b0b5d45376dd1c7368e93cab94005343d40de71f))
* link mod empty state to account import ([e54e880](https://github.com/bitsocialnet/5chan/commit/e54e8802c380b08b4cc587284c397b0abe67f88d))
* **portless:** force HTTPS proxy startup ([33bf4da](https://github.com/bitsocialnet/5chan/commit/33bf4dabceccdf98a3372e98469b7e48806c4041))
* **post menu:** update Yandex reverse image parameter ([42021fe](https://github.com/bitsocialnet/5chan/commit/42021fe9ff473fa99b9634671f500e8cbb0dc23d))
* **react grab:** restore dev toolbar ([cb9c830](https://github.com/bitsocialnet/5chan/commit/cb9c830b5a6b6726000dfd08687566e2c9432c62))
* **replies:** order approved queue replies ([463509e](https://github.com/bitsocialnet/5chan/commit/463509e10514cd061232bd44e2cfc551efd9caef))
* **routing:** allow hash path redirect under CSP ([fe48208](https://github.com/bitsocialnet/5chan/commit/fe48208078a82a9c6acf754e01db27980ae63657))


### Features

* **p2p:** enable browser pkc mode ([28286f0](https://github.com/bitsocialnet/5chan/commit/28286f042bd3963d64391eb9170633b13e2279ac))


### Performance Improvements

* **mod queue:** reduce loading rerenders ([abaa0d4](https://github.com/bitsocialnet/5chan/commit/abaa0d4e1694271f5dc5aa8957965a551de28f6e))



# [0.8.0](https://github.com/bitsocialnet/5chan/compare/v0.7.4...v0.8.0) (2026-04-23)


### Bug Fixes

* **account-data-editor:** load Ace before esm-resolver ([77d2271](https://github.com/bitsocialnet/5chan/commit/77d22713dabd43f4db93fce499ecb59743a21dd8))
* **board status:** resolve offline indicators with strict community refs ([4cae9c3](https://github.com/bitsocialnet/5chan/commit/4cae9c3caa7a781524e45d305fb4ec12a5d11bd5))
* **board:** wait for feed before empty state ([5b124d4](https://github.com/bitsocialnet/5chan/commit/5b124d44692d31746961c29d11a7e0b830073954))
* **catalog:** reuse board feed identity when idle ([58a4be1](https://github.com/bitsocialnet/5chan/commit/58a4be1be7867bddeceaa44b5995712a6eb0b80f))
* **challenge modal:** snap close button to whole pixels ([ec8678c](https://github.com/bitsocialnet/5chan/commit/ec8678cc4ee2b1a0d8c92588df91d2180be21bae))
* **challenge:** support pkc spam blocker flow ([956fb42](https://github.com/bitsocialnet/5chan/commit/956fb426eaf7cd8e80054c4d5f3b32939af22bb9))
* **deps:** bump bitsocial-react-hooks ([e2fabb6](https://github.com/bitsocialnet/5chan/commit/e2fabb6fd91c19cb4f69a15fcf6e0070389fd96b))
* **deps:** pin hooks to dist-synced tarball ([80f41f0](https://github.com/bitsocialnet/5chan/commit/80f41f00db2b0b674c338284538bd2975f085fc9))
* **deps:** remove hooks consumer patch ([142f389](https://github.com/bitsocialnet/5chan/commit/142f38909ee039afd472b79802c6f161aac9052e))
* **deps:** resolve Dependabot alerts for protobufjs and follow-redirects ([c260675](https://github.com/bitsocialnet/5chan/commit/c260675d06328f18db15538fa186a1d1db13edc6))
* **dev:** auto-open portless URL after vite is ready ([683c407](https://github.com/bitsocialnet/5chan/commit/683c407043975cb0ed0c484161755db6bfb9746f))
* **directories:** include history board metadata ([6c72c33](https://github.com/bitsocialnet/5chan/commit/6c72c336fa7f3ce146e9881d9332d5daf40e36c6))
* **directories:** support multisub public keys ([f52545e](https://github.com/bitsocialnet/5chan/commit/f52545ec5b1226aba9cfc2c53bd7c58aa4489ea2))
* **electron:** restore pkc rpc import ([5b1e816](https://github.com/bitsocialnet/5chan/commit/5b1e8166fe286f384999cb498471690848c2d01a))
* **feed:** restore multiboard loading placeholder ([431f84b](https://github.com/bitsocialnet/5chan/commit/431f84b871571708293e964571db1c7b34071701))
* **feed:** support strict community refs and safer domain publishing ([6212353](https://github.com/bitsocialnet/5chan/commit/621235379c94e1addc5ee7f5aa3a9fa2a791a90f))
* **feed:** unblock multiboard directories with public key fallback ([fea7b8e](https://github.com/bitsocialnet/5chan/commit/fea7b8ea10635184c822c9f2407b2bad34837575))
* hide generated account copy for imported accounts ([7bf0888](https://github.com/bitsocialnet/5chan/commit/7bf0888221cffb063c1b37364f15240e831f4af7))
* **home:** preserve popular threads during navigation ([508fffe](https://github.com/bitsocialnet/5chan/commit/508fffe5d6077ed2dd9f5d66fdfbd38a45606254))
* **hooks:** handle pkc rebrand regressions ([19095ae](https://github.com/bitsocialnet/5chan/commit/19095aefa1bf644eaad5f1977a82acc8b5a03cfd))
* **i18n:** add offline board warning copy ([4a755ac](https://github.com/bitsocialnet/5chan/commit/4a755ac5b04b8796c3dbb5c0e53d8313847901c9))
* **mod queue:** keep approved items from sticking ([8957f04](https://github.com/bitsocialnet/5chan/commit/8957f0439ef0028a9deab50f7e614d3143b4f8c4))
* **mod queue:** preserve moderated queue history ([81b9b2e](https://github.com/bitsocialnet/5chan/commit/81b9b2e8075c2c665491bcd5f8c375445105efaa))
* **multiboards:** restore stable time-filter suggestions ([4942259](https://github.com/bitsocialnet/5chan/commit/49422591b830af504e1823d33fd1bf3d5679cedb))
* **pending posts:** show publish errors ([338f415](https://github.com/bitsocialnet/5chan/commit/338f415f2a85012646920303c01507b99d45b388))
* **post card:** clarify full error copying ([be13311](https://github.com/bitsocialnet/5chan/commit/be13311834322d439ddaf8968e360fcd5a1d6b01))
* **publishing:** normalize media links to https ([fb19ee4](https://github.com/bitsocialnet/5chan/commit/fb19ee47c8d9bfdc1ddf85031fc4ce7f66ebacf2))
* **publish:** retry failed comments without duplicate replies ([5f9e603](https://github.com/bitsocialnet/5chan/commit/5f9e603b621856980f99db9b007b86a792452d02))
* **quotes:** keep same-thread board previews local ([e366dac](https://github.com/bitsocialnet/5chan/commit/e366dac25cbf42bfa27a386922d42cac185db5e8))
* **release:** cache Windows release dependencies ([3524c1c](https://github.com/bitsocialnet/5chan/commit/3524c1c01eb22e84dcaddfd76c3ae81a1187ba11))
* **release:** restore Android signing keystore ([82476d8](https://github.com/bitsocialnet/5chan/commit/82476d8586d8d3d391b2abed0b8d64bcc8af0e0f))
* **reply-quote-preview:** keep floating OP previews at desktop width ([f6ce2ba](https://github.com/bitsocialnet/5chan/commit/f6ce2ba018f842c231067902cf7a0a086b7d40dd))
* **rules:** keep board selector limited to default boards ([3d40e6c](https://github.com/bitsocialnet/5chan/commit/3d40e6c37e4ddc188f5b8f9ac6ff792a32609510))
* **settings modal:** snap bitmap controls to whole pixels ([d87be15](https://github.com/bitsocialnet/5chan/commit/d87be159e25979ff267705ac920b6ea1a9e47890))


### Features

* auto-complete iframe challenges ([b288c62](https://github.com/bitsocialnet/5chan/commit/b288c62c06ac954e733906e9be9b1fd130b576a0))
* **multiboards:** expand time filters in place ([70d8c37](https://github.com/bitsocialnet/5chan/commit/70d8c372226caa6e53bcbe79aa26d6956b9adef4))
* **pass:** add pass page and update voting copy ([1c6cf3f](https://github.com/bitsocialnet/5chan/commit/1c6cf3fc0f9197ab2631732eb3b507ceeb29bce2))
* **pass:** localize pass page copy ([d8944e3](https://github.com/bitsocialnet/5chan/commit/d8944e3c7cc0dc1c0d1178adad7e7663b18e8706))


### Performance Improvements

* **board:** reduce desktop reverse-scroll jank on /all ([e161606](https://github.com/bitsocialnet/5chan/commit/e1616061472049740ae595f5e740285568f316b1))
* **homepage:** isolate boards list from live hook churn ([7fb825b](https://github.com/bitsocialnet/5chan/commit/7fb825b4c66642d16e377175290e69a67eb48b2b))
* **home:** stop popular threads rerenders after load ([4b06ac8](https://github.com/bitsocialnet/5chan/commit/4b06ac8c9ab9c4bad2dbc14d90993972bde19b37))
* **pwa:** reduce precache asset fanout ([80e0cab](https://github.com/bitsocialnet/5chan/commit/80e0cabf01c5efe522741171c95f47871667e8b2))



## [0.7.4](https://github.com/bitsocialnet/5chan/compare/v0.7.3...v0.7.4) (2026-04-09)


### Bug Fixes

* **catalog-search:** clear stale query filter ([4fb7739](https://github.com/bitsocialnet/5chan/commit/4fb7739991830464a43a72ea7597410cc94afa80))
* **catalog:** address missed review findings ([a35ec83](https://github.com/bitsocialnet/5chan/commit/a35ec8396654515de913a40b34ba22a0cdce873b))
* **catalog:** avoid stretching unknown-size thumbnails ([eeb288e](https://github.com/bitsocialnet/5chan/commit/eeb288e2dc47b26d298f81ed9562fb2504745cc3))
* **catalog:** stop virtualizing single-board catalogs ([#1121](https://github.com/bitsocialnet/5chan/issues/1121)) ([7ba28be](https://github.com/bitsocialnet/5chan/commit/7ba28becc59c079ae44b987b649ef9210d8be549))
* **deps:** patch vulnerable transitive packages ([315505f](https://github.com/bitsocialnet/5chan/commit/315505fb8d9989b316a29311cf39d5a64580ca3d))
* **dev server:** fall forward from port 1355 without portless ([75958ac](https://github.com/bitsocialnet/5chan/commit/75958ac0c5ed607d9b6cb6137cfeaab838898ba1))
* **favicon:** harden sfw board icon swapping ([0b844e6](https://github.com/bitsocialnet/5chan/commit/0b844e60601528a1aecf48d016eca67e23a66c7d))
* **portless:** avoid route collisions across worktrees ([8078d10](https://github.com/bitsocialnet/5chan/commit/8078d10441c37d811096afa7f7fb6a18f6453596))
* **portless:** fall forward when branch route is occupied ([6a3040d](https://github.com/bitsocialnet/5chan/commit/6a3040dc551cae7bd80bb8ab25bac07bfbbf6535))
* **post:** load capcode icons from public asset root ([74f8fae](https://github.com/bitsocialnet/5chan/commit/74f8fae496831a2bc6042a128269e014b7e4c482))
* **release:** normalize asset names ([85e81aa](https://github.com/bitsocialnet/5chan/commit/85e81aae2e6ee7e67744fbe206bc0d1ff0328a78))
* **reply modal:** stop recentering on input ([e345935](https://github.com/bitsocialnet/5chan/commit/e345935aacc98b787198ff87e3645751afc708c3))


### Features

* finalize pretext feed sizing rollout ([#1120](https://github.com/bitsocialnet/5chan/issues/1120)) ([251e103](https://github.com/bitsocialnet/5chan/commit/251e103db3349143ddc4aaaec3a577c53741ee87))


### Performance Improvements

* **board:** reduce mobile reverse-scroll jank ([99c0bbf](https://github.com/bitsocialnet/5chan/commit/99c0bbfac5a0372e36c53cf809688efe0fece17c))



## [0.7.3](https://github.com/bitsocialnet/5chan/compare/v0.7.2...v0.7.3) (2026-03-20)


### Bug Fixes

* **accounts:** adapt 5chan to compact account history hooks ([#1118](https://github.com/bitsocialnet/5chan/issues/1118)) ([c2e8e16](https://github.com/bitsocialnet/5chan/commit/c2e8e169c249cea154a55a8788dd8bc541d8cd8a))
* allow edit modal saves after delete toggles ([ce2ad82](https://github.com/bitsocialnet/5chan/commit/ce2ad82c8cbda2f071f62d3a43023cd5ea30ff0a))
* **ci:** avoid husky during yarn install ([50301fb](https://github.com/bitsocialnet/5chan/commit/50301fb4e86c02f25ed1ea901da7045d336ffb76))
* **ci:** cache yarn after corepack in windows packaging ([4ec74bc](https://github.com/bitsocialnet/5chan/commit/4ec74bc85e9797a73f5228788227aef87c936a51))
* **ci:** declare electron rebuild binary ([34662f1](https://github.com/bitsocialnet/5chan/commit/34662f19896149897218a61dfcc9000fae7a10c6))
* **ci:** drop legacy yarn install flags ([da62c27](https://github.com/bitsocialnet/5chan/commit/da62c27180255f81307401fe464bfeadf56297a8))
* **ci:** remove setup-node yarn cache ([91e5131](https://github.com/bitsocialnet/5chan/commit/91e5131d29a16236f2191aeebde66ca21e8bba30))
* **ci:** windows job was hanging ([4d5ee59](https://github.com/bitsocialnet/5chan/commit/4d5ee595e4d6e9e8104742b6131934e0526911b4))
* **release:** include version in DMG artifact names ([5ce0e79](https://github.com/bitsocialnet/5chan/commit/5ce0e797c719b5c1ea95cb811a3094eff11a61e2))
* **thread-page:** make thread auto updates opt-in ([#1115](https://github.com/bitsocialnet/5chan/issues/1115)) ([816281c](https://github.com/bitsocialnet/5chan/commit/816281c6077f30f9780ee8c82283ea8cbdb313d7))
* **vercel:** use Yarn 4 install command ([15df2e5](https://github.com/bitsocialnet/5chan/commit/15df2e538509f5d1c9660fc5651e730d17c55bab))


### Features

* add in-app update flow and native e2e verification ([#1112](https://github.com/bitsocialnet/5chan/issues/1112)) ([5ecf8fb](https://github.com/bitsocialnet/5chan/commit/5ecf8fbea8f36f4b59c3b39676aa92dd83fced57))
* **app-update:** add in-app update flow with native e2e coverage ([a2286aa](https://github.com/bitsocialnet/5chan/commit/a2286aa68eca5e151d788dd72030b8174dd56791))



## [0.7.2](https://github.com/bitsocialnet/5chan/compare/v0.7.1...v0.7.2) (2026-03-17)


### Bug Fixes

* **ci:** publish coverage badge from badges branch ([#1091](https://github.com/bitsocialnet/5chan/issues/1091)) ([b2946e8](https://github.com/bitsocialnet/5chan/commit/b2946e8b2e1b370142c9162810a94990d505cec3))
* **ci:** publish coverage badge via GitHub Pages ([2de723a](https://github.com/bitsocialnet/5chan/commit/2de723a076c2087848205422839fe3039fb8aefc))
* **ci:** scope Electron native rebuilds ([#1099](https://github.com/bitsocialnet/5chan/issues/1099)) ([2c276f0](https://github.com/bitsocialnet/5chan/commit/2c276f05eb2a608a830eb100725673a3957ff96c))
* **electron:** restore packaged desktop app loading ([#1095](https://github.com/bitsocialnet/5chan/issues/1095)) ([c9bd625](https://github.com/bitsocialnet/5chan/commit/c9bd6258b2ba6f3e2dea9b655decd1af450401b6))
* **pwa:** make web updates deterministic ([#1093](https://github.com/bitsocialnet/5chan/issues/1093)) ([f812fe1](https://github.com/bitsocialnet/5chan/commit/f812fe1d1890287a7caa57690a40ba83d27fdf3d))


### Features

* **home:** show platform-specific info message on homepage ([1db0c62](https://github.com/bitsocialnet/5chan/commit/1db0c625e814b1b569c68efe858dff3e0d376705)), closes [#1096](https://github.com/bitsocialnet/5chan/issues/1096)
* **settings:** add expanded video auto-unmute preference ([#1104](https://github.com/bitsocialnet/5chan/issues/1104)) ([714c39c](https://github.com/bitsocialnet/5chan/commit/714c39cf47779fd759691c57a4bfefa15e6400ca))


### Performance Improvements

* **replies:** prefer cached board preview replies ([#1101](https://github.com/bitsocialnet/5chan/issues/1101)) ([8c37258](https://github.com/bitsocialnet/5chan/commit/8c37258f203b410154e8f2aee114311e192d71f4))



## [0.7.1](https://github.com/bitsocialnet/5chan/compare/v0.7.0...v0.7.1) (2026-03-16)


### Bug Fixes

* **edit-menu:** allow pseudonymous reply deletion ([#1076](https://github.com/bitsocialnet/5chan/issues/1076)) ([7265225](https://github.com/bitsocialnet/5chan/commit/726522586c5c56e28125cb4f6b162e43a00c0ee9))
* **electron:** lazy-load before-pack ipfs downloader ([a37fbcb](https://github.com/bitsocialnet/5chan/commit/a37fbcb9bcf6ace259e32af5e9258937774fd357))
* **mod-queue:** show board button from live roles ([#1079](https://github.com/bitsocialnet/5chan/issues/1079)) ([fd9ab19](https://github.com/bitsocialnet/5chan/commit/fd9ab19de38ac680ebebceeb21b0b59c916dee2f))
* **multiboards:** hide archive button slot ([47e8c5a](https://github.com/bitsocialnet/5chan/commit/47e8c5a37bd31060f737ffd7e88e108e98f46f53))
* **reply-modal:** keep drag interactions sharp ([#1086](https://github.com/bitsocialnet/5chan/issues/1086)) ([37c834d](https://github.com/bitsocialnet/5chan/commit/37c834d97584419c0ec800dd5b714b623811021a))
* **reply-quote-preview:** restore `(You)` for pseudonymous quotes ([#1084](https://github.com/bitsocialnet/5chan/issues/1084)) ([3a7400e](https://github.com/bitsocialnet/5chan/commit/3a7400e4a8c0a6ec095042ea9f54dd4a47056444))
* **security:** patch vulnerable transitive packages ([be44aef](https://github.com/bitsocialnet/5chan/commit/be44aefd49d906ee279ea37ab726db0e7748d72c))
* **testing:** stabilize Vitest worktree runs ([#1081](https://github.com/bitsocialnet/5chan/issues/1081)) ([7ed0edd](https://github.com/bitsocialnet/5chan/commit/7ed0edd50e5ba7619deb8060da610b0250735f41))
* **thread:** count user id tooltips from thread data ([6ecf3c4](https://github.com/bitsocialnet/5chan/commit/6ecf3c40d3a099fb00c7a0f4b8ef8e5a33c1ccf9))


### Features

* **archive:** implement comment.archived and add archive page ([#1074](https://github.com/bitsocialnet/5chan/issues/1074)) ([aedee9f](https://github.com/bitsocialnet/5chan/commit/aedee9fb835e7b3f27a274aa7f0c85a4350cd4c4))
* **post-menu:** add Report/Delete, reorder buttons, edit-only-for-mods, copy link 5chan.app ([#1089](https://github.com/bitsocialnet/5chan/issues/1089)) ([f4ff7a2](https://github.com/bitsocialnet/5chan/commit/f4ff7a23f7ada02647a8277f1adcc3527a4be015))
* **skills:** add inspect-elements skill backed by element-source ([7f4e069](https://github.com/bitsocialnet/5chan/commit/7f4e069783c3280ea6f2c8799bf69b7de5aa455e)), closes [#1082](https://github.com/bitsocialnet/5chan/issues/1082)



# [0.7.0](https://github.com/bitsocialnet/5chan/compare/v0.6.10...v0.7.0) (2026-03-12)


### Bug Fixes

* **catalog:** use alias-aware media link labels ([#1056](https://github.com/bitsocialnet/5chan/issues/1056)) ([2dd7c0e](https://github.com/bitsocialnet/5chan/commit/2dd7c0e8d77e5572737cb48eee6498db05b56c09))
* **ci:** URL-encode asset filenames and allow release updates ([3401ec1](https://github.com/bitsocialnet/5chan/commit/3401ec147f53a0c0f56d7709283b852dd074e808))
* **mobile:** hide empty mobile reply backlink wrapper ([#1060](https://github.com/bitsocialnet/5chan/issues/1060)) ([ef375e3](https://github.com/bitsocialnet/5chan/commit/ef375e3578dd14ed9c7e8a75adcb85e8d331a29d))
* **post:** move failed publish notice into comment body ([#1066](https://github.com/bitsocialnet/5chan/issues/1066)) ([0aafb7f](https://github.com/bitsocialnet/5chan/commit/0aafb7f538f505802495a220cc8174cbb2ee78e5))
* **post:** stop thread navigation from forcing OP alignment ([#1052](https://github.com/bitsocialnet/5chan/issues/1052)) ([6c03253](https://github.com/bitsocialnet/5chan/commit/6c03253cb4baf480287f6ebbc3e15c98c937c725))
* **quotes:** resolve external quote links across boards ([#1064](https://github.com/bitsocialnet/5chan/issues/1064)) ([fe55e6f](https://github.com/bitsocialnet/5chan/commit/fe55e6f33250b247c06091fd17f1f343b4095644))
* **replies:** refresh thread backlinks from live account replies ([#1058](https://github.com/bitsocialnet/5chan/issues/1058)) ([ea792fe](https://github.com/bitsocialnet/5chan/commit/ea792fe8a89dbc738e163c20b49db34133f9b10a))
* **settings-modal:** raise settings modal above reply and challenge modals ([#1062](https://github.com/bitsocialnet/5chan/issues/1062)) ([053965f](https://github.com/bitsocialnet/5chan/commit/053965f124543341a49c7c440e2ff75cec618054))
* **viewport:** remove maximum-scale=1 to restore reply modal autofocus on mobile ([#1069](https://github.com/bitsocialnet/5chan/issues/1069)) ([aca0eef](https://github.com/bitsocialnet/5chan/commit/aca0eef50e3445ba272171c00d875b8adcc22b80))


### Features

* **ui:** polish advanced settings, media hosting warning, reply modal mobile UX ([#1054](https://github.com/bitsocialnet/5chan/issues/1054)) ([d56175a](https://github.com/bitsocialnet/5chan/commit/d56175a66eae012e543a4026d8f656c8c089831d))


### Reverts

* Revert "Update README.md" ([debf6cc](https://github.com/bitsocialnet/5chan/commit/debf6cca6b2fc2200cf82cf6f6b8d39eff754047))



## [0.6.10](https://github.com/bitsocialnet/5chan/compare/v0.6.9...v0.6.10) (2026-03-10)


### Bug Fixes

* **ai-workflow:** delete merged local task branches ([f27a823](https://github.com/bitsocialnet/5chan/commit/f27a8233bc8217ea8470579e077b57e5bbc49c65))
* **ai-workflow:** finalize linked issue after PR merge ([#1047](https://github.com/bitsocialnet/5chan/issues/1047)) ([248a38d](https://github.com/bitsocialnet/5chan/commit/248a38d71c1b89dfaf8198fc04fa8b3732169e48))
* **ai-workflow:** scan full project item list before add ([4cb5c4a](https://github.com/bitsocialnet/5chan/commit/4cb5c4a83362cf2b4a758822c4fa9f416334c4f1))
* **post:** align op permalinks to the outer thread container ([#1050](https://github.com/bitsocialnet/5chan/issues/1050)) ([6ed3708](https://github.com/bitsocialnet/5chan/commit/6ed3708322b43dcbd17444883e36ebdbb3eab778))
* **post:** avoid duplicate history entries on OP permalinks ([773debe](https://github.com/bitsocialnet/5chan/commit/773debece336e5f70979fd9e5bb2236878e61ed6))
* **subplebbit:** resolve aliased board metadata in subplebbit selectors ([a862852](https://github.com/bitsocialnet/5chan/commit/a862852e536324f0c0c09cdc59936ed3e9a4f122))



## [0.6.9](https://github.com/bitsocialnet/5chan/compare/v0.6.8...v0.6.9) (2026-03-10)


### Bug Fixes

* **android tests:** align runner stage assertions ([045bea7](https://github.com/bitsocialnet/5chan/commit/045bea7ff9da0e1e19ec9703035c5528178da663))
* **challenge flow:** abandon publish immediately on modal close ([9cc6876](https://github.com/bitsocialnet/5chan/commit/9cc68768872940bfca272fb29a28d0fae9611a30))
* **ci:** prevent partial releases when a build job fails ([10cd995](https://github.com/bitsocialnet/5chan/commit/10cd99545e2ec062786d83a899b4738df3f5e6b6))
* **comment-content:** use info text style for purge message instead of red caps ([affea1b](https://github.com/bitsocialnet/5chan/commit/affea1b3ed867e2da3a9f5d1c7323c41fc346323))
* erase runtime Comment import in catalog filters store ([a8ef232](https://github.com/bitsocialnet/5chan/commit/a8ef232b1df11346a92ca6e3c0c4dd301af3ee37))
* handle purged posts in quote availability and mobile author counts ([58abae7](https://github.com/bitsocialnet/5chan/commit/58abae7e38d47e672ed3949f8d71e4c5b67b45e6))
* hold gif thumbnails until first frame is ready ([34e2c2b](https://github.com/bitsocialnet/5chan/commit/34e2c2bc4da23a3f739192dc081640bfb0ef829d))
* **home:** stabilize initial popular threads box ([824c14f](https://github.com/bitsocialnet/5chan/commit/824c14f5384715757c32326652410b3d64028928))
* **i18n:** default interface language to english ([9c79bf2](https://github.com/bitsocialnet/5chan/commit/9c79bf2198ef27f29fc8f1f84a78f2f33bd7e7be))
* **markdown:** handle unavailable reply quote links ([65731ce](https://github.com/bitsocialnet/5chan/commit/65731ceb3a6cb03445cc3898f1a688994161497a))
* **mod-queue:** preserve pending reject state after refresh ([a20f131](https://github.com/bitsocialnet/5chan/commit/a20f131201399f7849d81d5dfbdf87402795b823))
* patch bitsocial-react-hooks esm imports on install ([5d77a33](https://github.com/bitsocialnet/5chan/commit/5d77a33c38272989e494ffdcb733530b01133a7d))
* **popular-posts:** randomize popular thread board selection on mount ([c275903](https://github.com/bitsocialnet/5chan/commit/c27590372cf95b5f71100f9d7733d8eb4aee5d87))
* **post:** hide stuck Loading and Downloading board for pending comments ([980b5ca](https://github.com/bitsocialnet/5chan/commit/980b5ca57276322b7838dad19d40208f37403c50))
* **posts:** render per-post IDs on initial board load ([08d929b](https://github.com/bitsocialnet/5chan/commit/08d929bb9713374b7c6715e1f0d79558151f8985))
* **publishing:** abandon challenge close and clean failed local posts ([59851a4](https://github.com/bitsocialnet/5chan/commit/59851a4b01ba9ef356d4f081163f490c26443694))
* **quotes:** avoid striking unresolved quote links ([ec40456](https://github.com/bitsocialnet/5chan/commit/ec404569e78622d4f1b8500dd1ffcc94eb398a85))
* **replies:** hide author-deleted replies from thread views ([6954b5b](https://github.com/bitsocialnet/5chan/commit/6954b5bcc91a22e5d400b675a28513aaa7c737a2))
* **replies:** render CommentContent for purged replies so purge message displays ([27a294f](https://github.com/bitsocialnet/5chan/commit/27a294f949194110aa67d4e600a3c263b53a7796))
* **reply-modal:** align offline warning with post form ([08ec9f3](https://github.com/bitsocialnet/5chan/commit/08ec9f31ff5f47f1e86e45585e0df6e322b227a7))
* **routing:** canonicalize board aliases in thread routes ([1b9f698](https://github.com/bitsocialnet/5chan/commit/1b9f69839dfea13698ab1b7b9a26921258552bce))
* **seo:** serve sitemap and preserve static metadata files ([92eed04](https://github.com/bitsocialnet/5chan/commit/92eed04eb1324052e6ef1c0658d9a2aa7642d476))
* **settings:** restore style selector to interface settings ([892e6e8](https://github.com/bitsocialnet/5chan/commit/892e6e824ac4dbf1e56a75897387518070bd30dd))
* share board offline state between post form and reply modal ([723a2de](https://github.com/bitsocialnet/5chan/commit/723a2dee5270b6cf48974228073ab7d43cbfda27))
* stabilize catalog filter coverage imports ([fabdd0e](https://github.com/bitsocialnet/5chan/commit/fabdd0efe51763d22b7eadbc6da8603b2c8fa301))
* stabilize special theme coverage test ([0a392a3](https://github.com/bitsocialnet/5chan/commit/0a392a3f021847a3a1a8bb0073d540d0db367a0b))
* **tests:** mock board-buttons and style-selector to avoid Solana import crash ([3b34192](https://github.com/bitsocialnet/5chan/commit/3b341922c4266f7370a58ab8aa7b23bcb1beac8e))
* **vite.config.js:** remove deprecated rolldown dep optimizer config ([ca9f743](https://github.com/bitsocialnet/5chan/commit/ca9f743cefd66ef31953d7b7060f68d808983306))


### Features

* **catalog:** add mobile footer with Return, Archive, Top, Refresh buttons ([c3cfc7d](https://github.com/bitsocialnet/5chan/commit/c3cfc7d63a3ad6377f4454e0955b312428930a60))
* **markdown:** make spoiler tags case-insensitive like BBCode ([cf55eaa](https://github.com/bitsocialnet/5chan/commit/cf55eaa781fc736f700a51b4c7dd938ee781b21f))
* **markdown:** use BBCode-style [spoiler][/spoiler] tags ([91615db](https://github.com/bitsocialnet/5chan/commit/91615dbf4768e319cf50eb347b3138724445254d))
* **popular-threads:** show actual feed state string instead of generic loading ([04b98b8](https://github.com/bitsocialnet/5chan/commit/04b98b84a4b858960b7120ca2054fc46526d8dde))
* **posts:** add purge UI feedback for mods ([ae744d0](https://github.com/bitsocialnet/5chan/commit/ae744d0f78207fb5b14d82b122e5386226764f29))
* **subscriptions:** use useAccountSubplebbitAddresses for deduplicated addresses ([e80a736](https://github.com/bitsocialnet/5chan/commit/e80a73663faa50a1d83ed6bdae4e146b76ccbdf9)), closes [bitsocial-react-hooks#16](https://github.com/bitsocial-react-hooks/issues/16)


### Performance Improvements

* **popular-threads:** show board-count loading state for popular threads ([71b0b0f](https://github.com/bitsocialnet/5chan/commit/71b0b0fa42dc3dd2c742956735b97f5b0e56841c))



## [0.6.8](https://github.com/bitsocialnet/5chan/compare/v0.6.7...v0.6.8) (2026-03-04)


### Bug Fixes

* **boards-bar:** cancel debounced scroll handler on cleanup ([ea0789f](https://github.com/bitsocialnet/5chan/commit/ea0789faa1ef1d33e3e8b2ab425145b379fdb15e))
* **ci:** make portless optional for windows installs ([e484f96](https://github.com/bitsocialnet/5chan/commit/e484f96e3a3103f274d8d89252a42b33b9ad95ca))
* **comment-content:** prevent doubled >>postnumber quote when cidToNumber resolves late ([1aabe7a](https://github.com/bitsocialnet/5chan/commit/1aabe7a6b2569ae16f86b42407b3dbc3c8f70743))
* **edit-menu:** remove redundant double confirm for purge ([17afdc7](https://github.com/bitsocialnet/5chan/commit/17afdc7502160790f34b29d490162f257c10a4e8))
* **markdown:** preserve full URL display text for autolinked 5chan links ([27b2d6f](https://github.com/bitsocialnet/5chan/commit/27b2d6fd8a9d1bb9d6ac3a1f45de17056cc2f954))
* **popular-posts:** rank by time-decayed popularity instead of raw reply count ([9216791](https://github.com/bitsocialnet/5chan/commit/921679150576a4f25ff225fd07c1a6411afc8b71))
* **post form:** default link label to 'link to file' on /all/ and /subs/ ([2bc2827](https://github.com/bitsocialnet/5chan/commit/2bc2827f835213d26c368e9fc45b845117fd4c0e))
* **posts:** default to hiding user IDs when pseudonymityMode is undefined ([822b6c9](https://github.com/bitsocialnet/5chan/commit/822b6c937a561aa0eccae062d2d47a75f5ee2a7d))
* **publish:** use active account at publish time instead of baking stale author data at typing time ([422eacc](https://github.com/bitsocialnet/5chan/commit/422eacc5c1c8a3983eaec97c4d0f4967700d0d27))
* **react-grab:** disable Cmd+C shortcut to avoid copy/paste conflicts ([dfa203a](https://github.com/bitsocialnet/5chan/commit/dfa203a5065980aa9e90ab4c764a9c068631bb7a))
* **replies-preview:** stable sort when recency yields identical Infinity values ([c9e9506](https://github.com/bitsocialnet/5chan/commit/c9e9506ebdd2599b2ee3cb9bce773a311b93b89a))
* **string-utils:** guard truncateWithEllipsisInMiddle for small maxLength and slice(-0) ([8296d70](https://github.com/bitsocialnet/5chan/commit/8296d70fd6aaff25d092f6fa3e0428e9e8db3b62))


### Features

* **board-buttons:** reorganize button layout on mobile and desktop ([3a9b5ab](https://github.com/bitsocialnet/5chan/commit/3a9b5ab75ff94ca50a5d11258302177be456dd06))
* **board:** add mobile footer with Start a New Thread, Top, Refresh, pagination, Catalog, Load More ([1a4e8a6](https://github.com/bitsocialnet/5chan/commit/1a4e8a624b9fcd0485b4a7dcee1a175f73f3c08b))
* **boards-bar:** alphabetize mobile board select and show full multiboard titles ([efd1526](https://github.com/bitsocialnet/5chan/commit/efd152609dcd253933a560a71293cb2d84d71484))
* **favicon:** swap tab favicon for SFW vs NSFW boards ([3bd1c0a](https://github.com/bitsocialnet/5chan/commit/3bd1c0ad4f16a70f50b5f4e0e06d71e9466bb97e))
* **home:** clarify 5chan is serverless app, use current hostname for share links ([5fe2024](https://github.com/bitsocialnet/5chan/commit/5fe2024a490381207f9d0afc3d8d518d5ba30d41))
* **meta:** add OpenGraph, JSON-LD, security headers for crawler identity ([6bc135a](https://github.com/bitsocialnet/5chan/commit/6bc135aa6a02729e94882668139ad9a61166815d))
* **post-desktop:** truncate long file links with ellipsis in middle ([f2264ba](https://github.com/bitsocialnet/5chan/commit/f2264ba60c043c80d7ef724c6067bb8c45179c23))
* **post:** add mobile footer to thread view ([84e6057](https://github.com/bitsocialnet/5chan/commit/84e6057bb84422e41d89dc9b822d8621140c7fe8))
* **release:** add yarn release script and v0.6.7 blotter entry ([064d341](https://github.com/bitsocialnet/5chan/commit/064d3414f1de308c8b2c65cd2a9e0e028d8e44d1))


### Performance Improvements

* **media:** restrict gif frame extraction to gif media types ([7644d59](https://github.com/bitsocialnet/5chan/commit/7644d595990581fff721194435ff85a6b22d583f))
* **settings:** fix navigate-in-setState, memo sections, defer crypto resolution ([df1bc20](https://github.com/bitsocialnet/5chan/commit/df1bc2071ddc07e12e6509a51ff8abcbfcf3c41e))


### Reverts

* Revert "chore(release): v0.6.8" ([d8a003e](https://github.com/bitsocialnet/5chan/commit/d8a003ed1daf668adddcd5de63a8d7d61a8e9ead))



## [0.6.7](https://github.com/bitsocialnet/5chan/compare/v0.6.6...v0.6.7) (2026-03-01)


### Bug Fixes

* **a11y:** add translated aria-label for pagination, aria-label for close button ([f9325b9](https://github.com/bitsocialnet/5chan/commit/f9325b907c399721138259d684b83b60322d4633))
* **account-data-editor:** resolve Ace editor loading failure ([e12743f](https://github.com/bitsocialnet/5chan/commit/e12743f7832f141f3875166ff03827c084954105))
* **android-build:** keep tar@7 and patch Capacitor CLI extractor compatibility ([f660d1a](https://github.com/bitsocialnet/5chan/commit/f660d1a814fd455195d5394648a10e0e8fd152fc))
* **android:** guard against NPEs in FileUtils and FileUploaderPlugin ([bdfee1b](https://github.com/bitsocialnet/5chan/commit/bdfee1b12dfa3d0833dac3c811637b587f133ca3))
* **android:** log reject failures, handle trailing slashes in path, remove unused attr param ([3eb97e6](https://github.com/bitsocialnet/5chan/commit/3eb97e623fc54c31ac553ed21a323242a6615571))
* **android:** sanitize filename in FileUtils to prevent path traversal ([5f22ff1](https://github.com/bitsocialnet/5chan/commit/5f22ff10732ea23646611e657bc1342b716a3468))
* **backlinks:** hide backlinks from pending replies without comment number ([e241125](https://github.com/bitsocialnet/5chan/commit/e241125aacb8515202e9082616c0037b28831404))
* **backlinks:** scroll to reply and persist highlight when clicking OP backlink ([41f0712](https://github.com/bitsocialnet/5chan/commit/41f07124c6c7c7b2a2c6cffe65920fd519218454))
* **blotter:** validate message before formatReleaseMessage in release mode ([15c2385](https://github.com/bitsocialnet/5chan/commit/15c2385ece294962f4544118ebf97bdae4dbda46))
* **board-buttons:** use postCid for page number in PostPageStats ([9c0350c](https://github.com/bitsocialnet/5chan/commit/9c0350ca244b53e3f180a499350fa3fdfcb8fd1e))
* **board-buttons:** use useComment in PostPageStats so reply count shows on direct thread URLs ([ce8159f](https://github.com/bitsocialnet/5chan/commit/ce8159f2eabb594b372a7208f2175b9ec3590e4f))
* **board-pagination:** hide pagelist in multiboards, right-align style selector ([15d8103](https://github.com/bitsocialnet/5chan/commit/15d81033917cb4d4196b2df189f3dcf1edeacffe))
* **board-replies:** include pending and mod-queue account comments in 5-reply preview ([9253bad](https://github.com/bitsocialnet/5chan/commit/9253bad7a5916721581f7d89a5443b3bbfa925e4))
* **board:** add computeItemKey to Virtuoso to prevent media flash on page change ([849ff18](https://github.com/bitsocialnet/5chan/commit/849ff18a8b3ca29d34a7b42cc4cc7fc10a15c3fb))
* **board:** prevent cached Board from stripping accountCommentIndex on /pending/N ([79fd6ba](https://github.com/bitsocialnet/5chan/commit/79fd6bacd30ff2dd4ece42b599e418456e90b55a))
* **boardsbar:** show mod in mobile board selector when on /mod/ ([f35bb73](https://github.com/bitsocialnet/5chan/commit/f35bb73b55c104da99d16e0a7bb2e8d28a0e10d6))
* **build:** restore Vercel deployment with vite-plugin-pwa 1.2.0 and process.version define ([276fca8](https://github.com/bitsocialnet/5chan/commit/276fca808008d32e07d1a9e2194836b0003efcef))
* **catalog:** align pagination and postsPerPage with board view ([1067ff3](https://github.com/bitsocialnet/5chan/commit/1067ff39e80cd94fa9d937b81aa65360ac85ec0d))
* **catalog:** cap single-board catalog to maxGuiPages to prevent page 11+ posts ([13dba00](https://github.com/bitsocialnet/5chan/commit/13dba007789801797fbbcef8e919341e5401661f))
* chain providers, i18n, dedup isWebRuntime, and a11y label ([15d6087](https://github.com/bitsocialnet/5chan/commit/15d608764bb89776ba86a0a0fb20c620b3f3d826))
* **challenge-utils:** use console.log for success instead of console.warn ([ab32ad5](https://github.com/bitsocialnet/5chan/commit/ab32ad578cd8b8ff7736235c29e3127976637494))
* **components:** fix colSpan, hook usage, special theme reset, unused imports, CSS color ([6c1f535](https://github.com/bitsocialnet/5chan/commit/6c1f535efebd9e8024e7a3b90d08a3102f9a9aeb))
* compute click center from full box model quad ([023adcc](https://github.com/bitsocialnet/5chan/commit/023adccddf014c3886d4b65e24506a7a7b519ffc))
* **edit-menu:** render mod edit modal in FloatingPortal to escape reply card containment ([f19ebe5](https://github.com/bitsocialnet/5chan/commit/f19ebe5f33d3a8b0e078ad2f11a91cc99b26c2cc))
* **electron:** make macOS dev dock icon setup non-fatal ([a39fafa](https://github.com/bitsocialnet/5chan/commit/a39fafa08f41d2709cb798c3b81b2bd9b60686ce))
* **error-display:** reset showAfterDelay when error clears ([f5eba9a](https://github.com/bitsocialnet/5chan/commit/f5eba9adbeba352fa63fe912eb690c25fbed66a2))
* **feeds:** force infinite scroll on multiboards and canonicalize page URLs ([71fdbef](https://github.com/bitsocialnet/5chan/commit/71fdbef1eadea5347adcf6ac15bbe728d6c9e233))
* **i18n:** use consistent Filipino translation for blotter keys ([56cce10](https://github.com/bitsocialnet/5chan/commit/56cce1099281ebf886c4a6665c0e63e67f3d8593))
* **media:** reserve stable post media space before thumbnails resolve ([6ac9ac0](https://github.com/bitsocialnet/5chan/commit/6ac9ac0ee73490192c404c723b2c0a94a51f78dd))
* open portless URL instead of raw IP when dev server starts ([87f6a0b](https://github.com/bitsocialnet/5chan/commit/87f6a0bf890435cad4256a575d3e2f1a764add99))
* **popular-threads:** adaptive ranking with grow-only stability ([8cef8ce](https://github.com/bitsocialnet/5chan/commit/8cef8ce2a0a02e6546c26f37cf78ddd6a7048cda))
* **popular-threads:** pass linkWidth/linkHeight to CatalogPostMedia for correct aspect ratio ([7a516cf](https://github.com/bitsocialnet/5chan/commit/7a516cfbf94a86104363e29ba429acbbbcd810b3))
* **post-desktop:** hide omitted-replies summary when replies are disabled ([00a1164](https://github.com/bitsocialnet/5chan/commit/00a1164adf88fec34a7a33b63e63a2751086be82))
* **post:** add modQueueError, isPublishing, onApprove, onReject to memo comparator ([f86906a](https://github.com/bitsocialnet/5chan/commit/f86906ae15b6cbf687dfe9e24b9db71e95702431))
* **post:** ensure OP user ID tooltip shows at least 1 post in board view ([ebb5ae4](https://github.com/bitsocialnet/5chan/commit/ebb5ae464f63ae10c461d3d179560db5b4042689))
* **posts:** Board link in multiboard views (/all/, /subs/, /mod/) ([f521bdb](https://github.com/bitsocialnet/5chan/commit/f521bdbe33ba710c0c836b134a4ac0b458b05f62))
* **post:** show Pending for user ID when reply pending on pseudonymity boards ([21d2146](https://github.com/bitsocialnet/5chan/commit/21d214685da130134d5edd65bd24b3a4f8486a36))
* **post:** use feed cache fallback for instant post content on catalog navigation ([609436a](https://github.com/bitsocialnet/5chan/commit/609436a0fb56aa7f7471874a6ff9333b4fe1509e))
* **quotes:** scope post-number lookup by subplebbit, OP quote always navigates to thread ([216073a](https://github.com/bitsocialnet/5chan/commit/216073aee39396d6a8ce6a36fe4c3d70c453df29))
* **release:** harden release workflow installs ([ca2e024](https://github.com/bitsocialnet/5chan/commit/ca2e024c736659b9675ef540f12db868b41c774b))
* **reply modal:** keep textarea empty when opened from Post a Reply footer button ([bb02779](https://github.com/bitsocialnet/5chan/commit/bb027794ee0dea00f553660bd6f6279b14165409))
* **reply-modal:** remove link type previewer that displaces UI ([2733ab2](https://github.com/bitsocialnet/5chan/commit/2733ab260b149139a9b380b3ab075750258b3b2b))
* **reply-quote-preview:** add trailing break to mobile quotelinks so each >>N appears on its own line ([ec9ee6f](https://github.com/bitsocialnet/5chan/commit/ec9ee6ff43b21fcb6527600b6026d19659af25fa))
* **reply-quote-preview:** only scroll to reply when on thread page ([326b403](https://github.com/bitsocialnet/5chan/commit/326b40300fc3e335393cc8ed2af1a36d3f01178a))
* resolve android plugin registration and electron upload runtime detection regressions ([afdf129](https://github.com/bitsocialnet/5chan/commit/afdf129c3e41a4128ca5e47e7bde3078bb8e892e))
* resolve Dependabot alerts for tar and qs ([b5546fa](https://github.com/bitsocialnet/5chan/commit/b5546fa000c07a8cbfba801c8cd87dee47cc0147))
* resolve publication details visibility, comment re-render performance, and translation issues ([f123c08](https://github.com/bitsocialnet/5chan/commit/f123c08994f42efe27ea1a1dac9238518fca6335))
* **routing:** enforce numeric page param for board feed ([239f3be](https://github.com/bitsocialnet/5chan/commit/239f3be199eb09165b9901751963569a0fd7bbc0))
* upgrade react-i18next to resolve key prop warning ([4cdbf8c](https://github.com/bitsocialnet/5chan/commit/4cdbf8c6bc6ac7b909378aab6a7ebdaeb73ca368))
* **upload-automation:** harden android and electron failure handling ([b20aae8](https://github.com/bitsocialnet/5chan/commit/b20aae8244f4ae54982c1d0f9c705684e29802ff))
* **upload:** resolve electron file-path fallback and android provider automation stalls ([410b988](https://github.com/bitsocialnet/5chan/commit/410b988fbd653c9232cfa594fd5b4f3a54a92b1f))
* **use-state-string:** sanitize board feed loading wording ([967a2cb](https://github.com/bitsocialnet/5chan/commit/967a2cbc3196532d85fc0d238299513d86e9c578))
* **vercel:** serialize yarn install to prevent `date-fns` extraction failure ([bd07d37](https://github.com/bitsocialnet/5chan/commit/bd07d37811aecc70f8acc0309c39a6111d1c30d2))


### Features

* add shared cross-platform catbox media upload flow ([dbbc83d](https://github.com/bitsocialnet/5chan/commit/dbbc83d369fc81feb5d5bafed57f73bc6767b9fb))
* **android:** multi-provider WebView upload with postimages chooser contract ([e26da84](https://github.com/bitsocialnet/5chan/commit/e26da8463a5716e082197544184855cd15adb05e))
* **blotter:** replace board stats with changelog-backed blotter ([0cb7b1a](https://github.com/bitsocialnet/5chan/commit/0cb7b1a9705de34912a58bd958987c25e6f569cf))
* **board-buttons:** add Bottom button when infinite scroll is disabled ([445b271](https://github.com/bitsocialnet/5chan/commit/445b271982dad68c88f6a3522b099eee3682274a))
* **board-pagination:** redirect /boardIdentifier/1 to not-found, refine [All] button, hide pagelist when infinite scroll enabled ([dc43a84](https://github.com/bitsocialnet/5chan/commit/dc43a8438ec60a6602b48249956a816195a81f47))
* **board:** default pagination with optional infinite scroll and URL-based page routing ([60d2f68](https://github.com/bitsocialnet/5chan/commit/60d2f6804d6f045292c18cba5573a69ac569f291))
* **catalog:** add reply-count sorting mode ([24d7b3e](https://github.com/bitsocialnet/5chan/commit/24d7b3e057e7dced8ff7ac335bf1c6758fee89c5))
* **directories:** implement features.noSpoilers and features.noSpoilerReplies for board-specific spoiler checkbox ([45a6ff0](https://github.com/bitsocialnet/5chan/commit/45a6ff0bab5bb26996ee96d3aaf1d3d6f50ea701))
* **file-upload:** normalize Android Capacitor rejection and surface attempt details in UI ([bbddb9c](https://github.com/bitsocialnet/5chan/commit/bbddb9ce1792e154d14abe9d743c1fcfa12dc023))
* **home:** add Boards You Moderate link to Multiboards in boards box ([f6906e1](https://github.com/bitsocialnet/5chan/commit/f6906e1ff8a90c7a044e8afbd833be647e926cae))
* **media-hosting:** add multi-provider configurable upload with fallback ([96a4aae](https://github.com/bitsocialnet/5chan/commit/96a4aaec0ed5e49c3f39fdc37499e30110d74321))
* **media-hosting:** extend ProviderAttempt with stage/elapsedMs/matchedSelectors and parse plugin errors ([f1f5789](https://github.com/bitsocialnet/5chan/commit/f1f5789118154f0271cff695c4f96662bdd4888d))
* **media-upload:** Electron recipe parity and diagnostics ([b3e8df3](https://github.com/bitsocialnet/5chan/commit/b3e8df318c0556654a0105d4f3a954f5acfa6a11))
* **mod-queue:** redesign with multiboard summary, boardsbar-style links, and board-aware rows ([fd6ca36](https://github.com/bitsocialnet/5chan/commit/fd6ca36acc66227e8a37971eabcde96fe6f435cf))
* **post-desktop:** show filename instead of full URL when requirePostLinkIsMedia ([2debf96](https://github.com/bitsocialnet/5chan/commit/2debf964cce91bc9f73bebaa43bb9d9dc3d9c1d8))
* **post-form:** show 'Link To File' when requirePostLinkIsMedia is true ([9793f0e](https://github.com/bitsocialnet/5chan/commit/9793f0ed605b5d3d1d8b7f60edd87429fcfa93bc))
* **profiling:** add react-scan via direct import for dev-only profiling ([cd71602](https://github.com/bitsocialnet/5chan/commit/cd716027305dfe9df4f31a3347135cae58fa291a))
* **rules:** add URL params for direct links to board rules ([64c8953](https://github.com/bitsocialnet/5chan/commit/64c89533f0c19aec30eb3dffcab874018b2a4101))
* **rules:** render markdown in board rules display ([cb0ab3a](https://github.com/bitsocialnet/5chan/commit/cb0ab3a6983ad3681985767225fea11b782870b6))
* **settings:** add media hosting settings and provider-based upload gating ([96f11b3](https://github.com/bitsocialnet/5chan/commit/96f11b3e2639e1770772c0b06ecb580c6aa8fa57))
* **settings:** move account json editing to dedicated full editor route ([fb9443a](https://github.com/bitsocialnet/5chan/commit/fb9443a0f8aa396d58d89462ece1a415d6cbeaba))
* show file/image labels instead of link when requirePostLinkIsMedia is truthy ([549300f](https://github.com/bitsocialnet/5chan/commit/549300f20daad6b87fc76da5f5ab6891503a8e86))
* **thread-stats:** show board page number in post stats via cache-first lookup ([0ddb22f](https://github.com/bitsocialnet/5chan/commit/0ddb22f5fa14235d66cf24dffe569a5a7f47602e))
* use portless for stable dev server URL ([7064c8b](https://github.com/bitsocialnet/5chan/commit/7064c8b6fdbc51a6067b8b9e368d6fd62ee34521))


### Performance Improvements

* **app:** enable FeedCacheContainer always, lazy-load modals ([34fdae1](https://github.com/bitsocialnet/5chan/commit/34fdae1e97828f59d7573a63a667f9cece452b5a))
* **board:** disable Virtuoso when single-board pagination is on ([9b538f3](https://github.com/bitsocialnet/5chan/commit/9b538f324de93da6b80dd4cdf7ae36b4090e68e6))
* **bundle:** replace plebbit-js imports with local utility, split chunks, fix CLS and rerenders ([4bdee03](https://github.com/bitsocialnet/5chan/commit/4bdee0362d4749ced52fd09d635cda4c5b5d36e6))
* **catalog:** memoize handleNewerPostsButtonClick with useCallback ([8f8c625](https://github.com/bitsocialnet/5chan/commit/8f8c6254cc55a4aa8323ac241c495b4dc1e61814))
* defer board reply fetching and remove nested mobile backlink fetch ([a13c72f](https://github.com/bitsocialnet/5chan/commit/a13c72f8881109f8f0508f012836a25564388b12))
* **feed:** reduce Virtuoso overscan and memoize itemContent for multiboard views ([6e08203](https://github.com/bitsocialnet/5chan/commit/6e08203ce663f0e4ad564fedba59455168189033))
* **feeds:** defer useReplies, Virtuoso for all paths, CLS fixes, memo ([9166796](https://github.com/bitsocialnet/5chan/commit/91667966f8bee14ea71858699dea1b5dc184b57f))
* **react-doctor:** fix compiler-blocking patterns, raise score 72→81 ([e0ed510](https://github.com/bitsocialnet/5chan/commit/e0ed510fc6716b7ebf7bf1a7631d6f5ecf4a5afd))



## [0.6.6](https://github.com/bitsocialnet/5chan/compare/v0.6.5...v0.6.6) (2026-02-16)


### Bug Fixes

* **challenge-utils:** format challenge errors with board identifier ([bb4be3f](https://github.com/bitsocialnet/5chan/commit/bb4be3ff6b8d5cb6e91ef16ce83a0e238ac573a6))
* **electron:** add macOS app icon via icon.icns ([6befc6b](https://github.com/bitsocialnet/5chan/commit/6befc6bacdecdd08db633e35edc74bbd26fae5ab))
* **home:** derive board link state from directory availability ([e47727c](https://github.com/bitsocialnet/5chan/commit/e47727c074bf5a60024b5c04f64e8bd33218fced))
* **modqueue:** enforce role-gated access with not-allowed view ([9c558d2](https://github.com/bitsocialnet/5chan/commit/9c558d21c1e930775871deaac66fe8524ea814a3))
* **popular-posts:** base quota on loaded boards instead of total directories ([2f563b4](https://github.com/bitsocialnet/5chan/commit/2f563b441adc39676a4c784cb7cafc19af6808d4))
* **post-status:** base pending and failed labels on cid and state ([98f7a52](https://github.com/bitsocialnet/5chan/commit/98f7a52e9b077096edc84a86e646f785f25c55c3))
* **post:** refresh author ID tooltip count when replies change ([44847b7](https://github.com/bitsocialnet/5chan/commit/44847b7e9558ca2a093858226bb48cd5702eb07d))
* **replies:** make thread replies update instantly for pending and confirmed states ([14c6bf8](https://github.com/bitsocialnet/5chan/commit/14c6bf8f3acc5f9fdc623602028db8e8fe671477))
* **replies:** prevent inline quote links from forcing line breaks ([378242c](https://github.com/bitsocialnet/5chan/commit/378242cdde4e417c3bd0d3a936c79fc2a347cf2a))
* **topbar:** sync subscription visibility with account subscriptions ([61eb1e8](https://github.com/bitsocialnet/5chan/commit/61eb1e80f5514382c2a2ebf403710ab116b9d679))


### Features

* **board-header:** add hover tooltip for address subtitle ([901f40f](https://github.com/bitsocialnet/5chan/commit/901f40f6b8e08c9c95f2d2effc87526037d0294b))
* **build:** sync vendored directories from GitHub on start and build ([8645f73](https://github.com/bitsocialnet/5chan/commit/8645f7365afc59ca7bccdbb6b6665bb61749b3ad))
* **directories:** add schema adapters and preserve v2 metadata ([ec62023](https://github.com/bitsocialnet/5chan/commit/ec620238e352bd632749cb751c85a9a9f7fc6e2b))
* **post-page:** enable Update button to refresh replies, add Auto alert translation ([ad41a78](https://github.com/bitsocialnet/5chan/commit/ad41a78974a0500352319261bff9a4e57eb3629e))


### Performance Improvements

* **post-rendering:** reduce quoted backlink rerenders via scoped store subscription ([7821f9c](https://github.com/bitsocialnet/5chan/commit/7821f9cd821e47b2c64de9d894f553600bd64493))
* remove reply backlink subscription churn ([3d2dbbf](https://github.com/bitsocialnet/5chan/commit/3d2dbbf75ca4962c8d069ea7c9c4c9cc1f7862bc))
* **replies:** progressive render, 500 replies/page, content-visibility ([dedf18e](https://github.com/bitsocialnet/5chan/commit/dedf18e1993f4732d085d025849a5b5ee88e2cfb))



## [0.6.5](https://github.com/bitsocialnet/5chan/compare/v0.6.4...v0.6.5) (2026-02-11)


### Bug Fixes

* **deps:** resolve dependabot alert ([50f373e](https://github.com/bitsocialnet/5chan/commit/50f373eb83eb5266895396a3266433751502a281))
* **post:** render OP backlinks from replies quoting OP ([d862550](https://github.com/bitsocialnet/5chan/commit/d862550132d10131f3cb157a6997547df1832e45))
* **post:** show OP backlinks in board feed cards ([2537561](https://github.com/bitsocialnet/5chan/commit/25375612a9d601aeefd3c543b67d39c2bf3e3e21))
* **reply modal:** make parent reply quote editable ([af259ad](https://github.com/bitsocialnet/5chan/commit/af259ad032c401625401a40cd1ec89f4e6968332))
* **reply:** replies should always target the OP, not other replies ([6c4c12c](https://github.com/bitsocialnet/5chan/commit/6c4c12c136ea7edf1397330eb0dc5515a7d8490b))
* scroll OP quote to thread card on same-route click ([716c782](https://github.com/bitsocialnet/5chan/commit/716c782d1a00514e60d56b065d7faa0389296244))


### Features

* populate quotedCids when publishing replies with quote references ([9f14a63](https://github.com/bitsocialnet/5chan/commit/9f14a63268a81b2a79fd2a9a9a665f4247f8d654))



## [0.6.4](https://github.com/bitsocialnet/5chan/compare/v0.6.3...v0.6.4) (2026-02-10)


### Bug Fixes

* **components:** remove redundant instant scroll from quote links ([1bd1d34](https://github.com/bitsocialnet/5chan/commit/1bd1d34feebe39cdb319cefc4c67cf681e886032))
* include manual post-number quotes in reply backlinks ([702816f](https://github.com/bitsocialnet/5chan/commit/702816f99b0e31d4d9b59e11831a519caf1c9e97))
* **post:** improve user ID display with domain detection and length limits ([9d17213](https://github.com/bitsocialnet/5chan/commit/9d17213e6606fe42908131cf26cb64e1ed4061b1))
* **post:** prevent quote hover highlight on op cards ([b8546a8](https://github.com/bitsocialnet/5chan/commit/b8546a86c55d25746b0a119e0519d77e36ae25e7))
* **release:** remove duplicate architecture suffixes from artifact names ([b30eb15](https://github.com/bitsocialnet/5chan/commit/b30eb150d05707daee48b0599053c9fee15c1aac))
* **release:** restore 5chan html zip artifact in tag releases ([cdd6be9](https://github.com/bitsocialnet/5chan/commit/cdd6be915ed98ef696b8efe04c2472654c457253))
* **reply modal:** restore multiline quote insertion ([db70a91](https://github.com/bitsocialnet/5chan/commit/db70a9148b6a9d34d93ef8246cd7c062a285e29f))
* shorten rendered user ID display from 12 to 8 characters ([24d329a](https://github.com/bitsocialnet/5chan/commit/24d329a3294cd49045410257472421d79359e990))
* show OP badge for number-based quote links ([223ec4c](https://github.com/bitsocialnet/5chan/commit/223ec4c4943fba789a9e65b38fcbea08764ebfde))
* update subscriptions subtitle to present tense ([8636005](https://github.com/bitsocialnet/5chan/commit/8636005f12eca2273aa8194e1293c80e9eff1888))


### Features

* add copy user ID menu item and rename copy link to copy direct link ([4a96f88](https://github.com/bitsocialnet/5chan/commit/4a96f88efd2b21578cfc823b822a7286956bd9a1))
* **post:** add backlinks for quotedCids ([c7c8c46](https://github.com/bitsocialnet/5chan/commit/c7c8c46557f09decee5aadaf0e65a087bd7c725b))
* **posts:** support pseudonymityMode per-reply hiding ([c1b0d13](https://github.com/bitsocialnet/5chan/commit/c1b0d13bb7f26d94513e74b67e79c50cca997783))
* **release:** extract one-liner release description ([3be7839](https://github.com/bitsocialnet/5chan/commit/3be78393d1af103ae6323d8e1615f742d4211a27))
* render >>{number} as interactive quote links with hover preview ([c4b6c77](https://github.com/bitsocialnet/5chan/commit/c4b6c77d4cb49357065fa21b51fbf3209895c58a))
* **reply-modal:** insert quoted post numbers at textarea caret ([8a192b4](https://github.com/bitsocialnet/5chan/commit/8a192b41b465995ce3421503f6811281c1aca3cc))



## [0.6.3](https://github.com/bitsocialnet/5chan/compare/v0.6.2...v0.6.3) (2026-01-30)


### Bug Fixes

* **electron-forge:** add app icon configuration for all platforms ([a2d0869](https://github.com/bitsocialnet/5chan/commit/a2d086990484ea4cf823282d997c89719f5c7bc9))
* **electron:** fix production build crashes ([388a120](https://github.com/bitsocialnet/5chan/commit/388a120c8ea387a48fa24152caac5c55a4c33734))
* **find-forge-executable:** make appName preference effective ([16012b4](https://github.com/bitsocialnet/5chan/commit/16012b42395523b8770411c65d82767da41fdb81))
* **forge.config.js:** remove malformed iconUrl from Squirrel config ([c4e2f75](https://github.com/bitsocialnet/5chan/commit/c4e2f753e38a0d69198e7aba83c0b4968671e180))
* **package.json:** remove unneeded var ([0c6e03d](https://github.com/bitsocialnet/5chan/commit/0c6e03d039d0303b3d7e896ff5e9ad169527db80))
* **release:** resolve build failures for v0.6.3 ([01bda3b](https://github.com/bitsocialnet/5chan/commit/01bda3bffb3ba423a4fda447668dc3682263e945))
* resolve PR 877 issues - route params, artifact paths, and build configs ([50ee10c](https://github.com/bitsocialnet/5chan/commit/50ee10cbc9055d9e2aa0e67df66b325b8f355b96))



## [0.6.2](https://github.com/bitsocialnet/5chan/compare/v0.6.1...v0.6.2) (2026-01-26)


### Bug Fixes

* **ci:** use setup-python action for macos release build ([3335f6f](https://github.com/bitsocialnet/5chan/commit/3335f6ff7675d93bd592b7390ba575fe7358eda3))
* **post:** include pending replies in useReplies calls ([2887347](https://github.com/bitsocialnet/5chan/commit/28873478a29c54b7c1ec22f02ca7300d545b20a1))


### Features

* **mod-queue:** improve compact view and add pending approval features ([fa4ec6d](https://github.com/bitsocialnet/5chan/commit/fa4ec6da40b42b7041774d747531c64dc10b26f6))



## [0.6.1](https://github.com/bitsocialnet/5chan/compare/v0.6.0...v0.6.1) (2026-01-25)


### Bug Fixes

* align asset-manifest generator output with prettier config ([4fd9a9c](https://github.com/bitsocialnet/5chan/commit/4fd9a9c1a98838dd9bbd05240905564fb6b6c85e))
* **android:** capacitor config was pointing to build instead of dist (legacy from CRA) ([436988e](https://github.com/bitsocialnet/5chan/commit/436988ee26f83c3c32c82a1a436006facec302de))
* **android:** release build fails due to tar v7 incompatibility with Capacitor CLI ([eda8b5e](https://github.com/bitsocialnet/5chan/commit/eda8b5ed86d5376c3fac92ca90901d8c83d1edf2))
* **board buttons:** guard against undefined address ([2a521ad](https://github.com/bitsocialnet/5chan/commit/2a521ad8f82160b83f2d400c5a75f41bcb61f6d1))
* **board header:** limit clickable area of subscriptions counter to text only ([4f49ec6](https://github.com/bitsocialnet/5chan/commit/4f49ec666626b7711d9166fdb9933b83b2bec186))
* **boards-list:** hide Multiboards section when filtering for worksafe boards ([594be88](https://github.com/bitsocialnet/5chan/commit/594be882101cf849e172b90c0944b98a3629bad2))
* **board:** subscribe to transient state and error fields separately ([4c4e120](https://github.com/bitsocialnet/5chan/commit/4c4e1209aaa0b78f4ae8b3c0497a1d2c38e219fa))
* **catalog-row:** expand CatalogPost memo comparator to prevent stale renders ([d71d518](https://github.com/bitsocialnet/5chan/commit/d71d518e271840f1603a1d5e578cbece086855df))
* **challenge modal:** show board name in iframe confirmation message ([5963123](https://github.com/bitsocialnet/5chan/commit/596312357f51bfeefe745fd782c129fbc275a938))
* **challenge-modal:** improve mobile iframe challenge modal positioning and sizing ([76e0732](https://github.com/bitsocialnet/5chan/commit/76e073228f43568b3fd1f80b7d476d8e0d1e9fdf))
* **ci:** fix test workflow failures on all platforms ([26278f9](https://github.com/bitsocialnet/5chan/commit/26278f92c6fc83ec43bf256592c69ef14c233b77))
* **ci:** mac smoke tests can't use timeout command ([724b623](https://github.com/bitsocialnet/5chan/commit/724b62344b5f318366c001704296ffddb4a9fe63))
* **ci:** macOS test builds fail with hdiutil "Resource busy" error ([46f0f49](https://github.com/bitsocialnet/5chan/commit/46f0f494e99a5fe113f0e27f46e97dcc0be6a2eb))
* **ci:** remove redundant electron-rebuild from build scripts ([96a3068](https://github.com/bitsocialnet/5chan/commit/96a306892868993f000af9c1f8928acbd928e3b3))
* **ci:** update deprecated intel mac runner ([2d23f44](https://github.com/bitsocialnet/5chan/commit/2d23f44bd80df5db75677b829c3484878d7f8d7c))
* **ci:** update macos runner image ([5f85a0a](https://github.com/bitsocialnet/5chan/commit/5f85a0ac1548b18566425ec76569647fe8ae4805))
* **comment-content:** ensure parent comment number is populated for nested replies ([c2bbe2d](https://github.com/bitsocialnet/5chan/commit/c2bbe2dd0b95d7e4b1fb1e3b988df0039d5e1684))
* **comment-content:** use correct banExpiresAt path for ban visibility ([476681c](https://github.com/bitsocialnet/5chan/commit/476681c689edba6fe0dbc052c9908649188cca60))
* correct horizontal centering of create board modal ([e863ddb](https://github.com/bitsocialnet/5chan/commit/e863ddb8b901191e7b5bb4f9527b0af994895a42))
* **deps:** add missing env-paths and progress dependencies ([a75eef7](https://github.com/bitsocialnet/5chan/commit/a75eef74959759d1c5a52ed31657d77bc58c91db))
* **deps:** resolve build dependency conflicts for Vercel deployment ([341fae9](https://github.com/bitsocialnet/5chan/commit/341fae91fc049c6cf518aaee2338e1eac52cb030))
* **deps:** resolve dependabot security alerts via yarn resolutions ([b93890b](https://github.com/bitsocialnet/5chan/commit/b93890b3bcf02a875a5e00f3f44ffeeb1f963987))
* **deps:** upgrade React to 19.1.2 to patch CVE-2025-55182 ([8e1bfa2](https://github.com/bitsocialnet/5chan/commit/8e1bfa2554fd9704a5f61148d1c8e8966ca82d85))
* **deps:** upgrade sharp to 0.34.5 to address security vulnerabilities ([8340953](https://github.com/bitsocialnet/5chan/commit/834095320375a4fe1d2596052c352f46356083ea))
* **directory-modal:** move to global layout and close on navigation ([ace4b0c](https://github.com/bitsocialnet/5chan/commit/ace4b0c8db0ee3dcc9e435a2988134932bfd325b))
* **disclaimer-modal:** correct CSS positioning and remove invalid HTML ([3aaa28f](https://github.com/bitsocialnet/5chan/commit/3aaa28f7430aeaf0158980765590f870cfaa376d))
* **disclaimer-modal:** update copy to reference "Accept" button ([7e1fe00](https://github.com/bitsocialnet/5chan/commit/7e1fe00dbf645fdb012b50bca0013bd0004065c9))
* **edit-menu:** use correct banExpiresAt path in commentModeration.author ([a959f14](https://github.com/bitsocialnet/5chan/commit/a959f14290f7262483ab3058dd2d3431be1b682e))
* **electron:** force GTK 3 on Linux to avoid GTK 2/3 vs GTK 4 crash ([547fc4d](https://github.com/bitsocialnet/5chan/commit/547fc4df814a22026d7bb9b614e2d4bcb3acb1df))
* **electron:** upgrade cacache for Node.js 22 compatibility ([ec2fb14](https://github.com/bitsocialnet/5chan/commit/ec2fb14cad9470898c9637fc1d83f70c753604e8))
* **error-display:** add delay to prevent false positive error displays ([341e72a](https://github.com/bitsocialnet/5chan/commit/341e72ad5b5a03152273c0060363579cbffc8cd3))
* **hooks:** fix usePopularPosts loading state and change detection ([a7614db](https://github.com/bitsocialnet/5chan/commit/a7614db743c3eff052b48a1401f427b38dbd03d2))
* **hooks:** remove postCid requirement from isAccountCommentAuthor check ([6175744](https://github.com/bitsocialnet/5chan/commit/6175744e7b4f9f56e562265751ac3bf5bcad6f2b))
* **hooks:** use structural equality for roles comparison in useStableSubplebbit ([647139c](https://github.com/bitsocialnet/5chan/commit/647139c0ec4a23f21fb4d7830285cc5123f9202a))
* HTML zip archive is empty in releases ([2f0fae8](https://github.com/bitsocialnet/5chan/commit/2f0fae846a49d8d5e949bf58e33381e2f08ebf81))
* limit vite-plugin-eslint to src/ files only ([f65635b](https://github.com/bitsocialnet/5chan/commit/f65635b549a7c73f31b52c7f5656fc20b6f02a1c))
* **lint:** use correct oxlint rule names and enable react plugin in config ([9fd41f2](https://github.com/bitsocialnet/5chan/commit/9fd41f2f9f8099fd23d2341371d6168b204c97fe))
* **markdown:** embedded media in comment.content shouldn't be expandable and should be already expanded ([fcd8838](https://github.com/bitsocialnet/5chan/commit/fcd8838045a8ba66852b2f69904f939d3a8c6153))
* **media-utils:** ignore blacklisted thumbnails ([f01a1dc](https://github.com/bitsocialnet/5chan/commit/f01a1dcaa96e2e009a310c2055c92eb49910bb68))
* memory leak in ModQueueButtonContent statusMap ([056096a](https://github.com/bitsocialnet/5chan/commit/056096aacecd64f79c57bbfc35ad381dec0aea7d))
* **mod queue:** adjust styling ([4fd0820](https://github.com/bitsocialnet/5chan/commit/4fd0820d94041bc625427cd1bdbaf4185dba3738))
* **mod queue:** alert threshold returns NaN when migrating from old localStorage format ([4a9f468](https://github.com/bitsocialnet/5chan/commit/4a9f4685cbedba4819404e4262cf2d00a08b077b))
* **mod queue:** button counter doesn't update when navigating between boards ([ca53fb4](https://github.com/bitsocialnet/5chan/commit/ca53fb4728f64a6847ebf34456a0d63e5b76e657))
* **mod queue:** CSS Modules not exporting rowOdd and alert classes ([6827aaa](https://github.com/bitsocialnet/5chan/commit/6827aaa141a22890932ac700ec66a954bb7b3ad7))
* **mod queue:** items shouldn't disappear from feed unless api removes them ([99596d3](https://github.com/bitsocialnet/5chan/commit/99596d3a54a81fd3439731951854681d2991df25))
* **mod queue:** ModQueueButton shows incomplete pending count without postsPerPage ([823731c](https://github.com/bitsocialnet/5chan/commit/823731cb2d38e811c0975b41934f1e386d9fb4be))
* **mod queue:** show mod queue button in /mod/ multiboard view ([6f9e3b2](https://github.com/bitsocialnet/5chan/commit/6f9e3b2330f506976cd9143c7261a744768daf91))
* **mod-queue:** alert animation and counter only for pending items ([a23f5bc](https://github.com/bitsocialnet/5chan/commit/a23f5bc2388f3ceae6d9bdbe9b7f24247c094d4b))
* **mod-queue:** button counter includes already approved/rejected items ([02fc6a3](https://github.com/bitsocialnet/5chan/commit/02fc6a3171517e06012138ad9f3ac6aa620d69dc))
* **mod-queue:** close CSS breakpoint gap and remove duplicate time-ago rendering ([ab98bd0](https://github.com/bitsocialnet/5chan/commit/ab98bd0a87f92af5ba70b88a360fd1132e0668bb))
* **mod-queue:** improve alert threshold input validation and add i18n for view selector ([d866372](https://github.com/bitsocialnet/5chan/commit/d86637200bc74f41e095023bfe58a5fb4e58ec35))
* **mod-queue:** style action buttons to match board buttons and make status indicators bold/colored ([fbdfadc](https://github.com/bitsocialnet/5chan/commit/fbdfadc65cd0ad24eff28552570ef91fa89fcddf))
* **mod-queue:** use link as excerpt when post has no title/content and prevent empty strings ([410fd54](https://github.com/bitsocialnet/5chan/commit/410fd541b33655d2668f85c25d52a1392703e3d5))
* **p2p-options:** correct Solana chainId from 1 to 101 ([52fea38](https://github.com/bitsocialnet/5chan/commit/52fea3851e0fe3bccadd8cae8b02e2204c45e397))
* **package.json:** missing license field ([696f19f](https://github.com/bitsocialnet/5chan/commit/696f19fcc0758ca00ad911f4eac8c2aba7aa1ada))
* **package.json:** unpin dependencies, fix script conflict ([f896c7d](https://github.com/bitsocialnet/5chan/commit/f896c7d96ac7d684bab0e57d77d3dfa762f71360))
* **popular-threads:** update memo comparator to include multisub entry titles ([f5cf263](https://github.com/bitsocialnet/5chan/commit/f5cf2634817ae26c73bdc3bfa18ec9b1a3fb5486))
* **post form:** fix positioning and styling on mobile ([e84038f](https://github.com/bitsocialnet/5chan/commit/e84038f185cfeb5c461bd32104c11a17a82822bc))
* **post-menu:** add copy link and hide block board for /all description ([1b22711](https://github.com/bitsocialnet/5chan/commit/1b227117767bc7d71f1cebf7d9d2e1359f788b49))
* **post-menu:** await clipboard copy before closing menu ([6f1fcaf](https://github.com/bitsocialnet/5chan/commit/6f1fcafc2c795cd4a2a48dbc42a137d58048fe3b))
* **post:** don't render empty avatar space when image url is invalid ([e1f1f28](https://github.com/bitsocialnet/5chan/commit/e1f1f280cc9a71e36406740314040c2db94d50bb))
* **post:** OP thumbnail overlaps with replies when image has unusual dimensions ([5e1114e](https://github.com/bitsocialnet/5chan/commit/5e1114e08715f9729c17a7e2a189838c68e50134))
* **post:** redirect to 404 when thread URL specifies wrong board ([6724f91](https://github.com/bitsocialnet/5chan/commit/6724f91c795cb8e1d3c4e63861464712fcebc12a))
* prevent memory leak from unbounded setInterval in use-time-filter ([eedb0fa](https://github.com/bitsocialnet/5chan/commit/eedb0fa08eb71c98d51e1068e79df8a4a2f48f9a))
* prevent race conditions and memory leaks in useCommentMediaInfo hook ([fc48021](https://github.com/bitsocialnet/5chan/commit/fc4802186d06ed24b7410cc49c022da06a2afc80))
* remove duplicate .filterModal .separator CSS rule ([8de4fba](https://github.com/bitsocialnet/5chan/commit/8de4fba9ed92e9dcd2b506bef898f35e3129e507))
* remove unused variables from catalog and post views ([760e8d9](https://github.com/bitsocialnet/5chan/commit/760e8d900ef0a9dc91dae31949aba555c9624d9c))
* rename invalid identifiers starting with digit to fivechan ([3360a41](https://github.com/bitsocialnet/5chan/commit/3360a41b00bea9a1ae3dd2b837faf1df0777ae03))
* **replies:** reply permalink didn't auto-scroll to deep replies ([b8e3a02](https://github.com/bitsocialnet/5chan/commit/b8e3a0202ae360fc210badaf00c56174a5606b83))
* reset board scroll on link nav ([9e13292](https://github.com/bitsocialnet/5chan/commit/9e13292ae3f137fc1352379d2f4939414953140c))
* resolve typescript errors in post menu components ([0b573ac](https://github.com/bitsocialnet/5chan/commit/0b573acf1db1fe3d2bcc65e54e23549c73af81aa))
* resolve TypeScript overload error in CopyLinkButton ([55dc396](https://github.com/bitsocialnet/5chan/commit/55dc3961202514067d477bfeae95590ea77be3b9))
* **routes:** prevent malformed routes and fix cache invalidation ([93859ec](https://github.com/bitsocialnet/5chan/commit/93859ec2f140be3af85856b3625125034b2fc27c))
* **routing:** handle empty boardPath and resolve directory codes ([b886cbd](https://github.com/bitsocialnet/5chan/commit/b886cbdf3b8fe3a4564eb0455442c2439d36bb50))
* **security:** upgrade dependencies to address dependabot alerts ([a25d4bf](https://github.com/bitsocialnet/5chan/commit/a25d4bfa9968f7b5356933d2a7654126ed223ef9))
* **settings:** resolve theme persistence bug after hard refresh ([26d014b](https://github.com/bitsocialnet/5chan/commit/26d014b6964cc1bc5b86e4d057025ac2913ab4d0))
* show cached feed time filter in UI ([198b613](https://github.com/bitsocialnet/5chan/commit/198b6135da410a6b6296140d6b9aa4860fe34915))
* **subplebbit-stats:** revert broken useStableSubplebbitStats hook ([64ef0dd](https://github.com/bitsocialnet/5chan/commit/64ef0ddccf6def43abd123b33cb4c2c7b8af9eb2))
* synchronize blinking animation in moderation queue ([5f4856a](https://github.com/bitsocialnet/5chan/commit/5f4856ad3c7e49fc4923d1cb25aca4cf3c50a37c))
* **theme:** prevent theme flash on board load ([b1ebf0b](https://github.com/bitsocialnet/5chan/commit/b1ebf0b4ae4e4e9361f3a3603f9d40fece2d6ef6))
* **themes:** all and subscriptions multiboards should use yotsuba ([9cc7869](https://github.com/bitsocialnet/5chan/commit/9cc78694d8ac4ff12a4743de08b85fb6ff8c2eec))
* **topbar edit modal:** show subscription addresses instead of directory codes ([43956d4](https://github.com/bitsocialnet/5chan/commit/43956d44a172046ed0f3e60162c6564090b9590e))
* **topbar-edit-modal:** memoize subscriptions array ([f997365](https://github.com/bitsocialnet/5chan/commit/f99736581340362133644fc46c31fa049ba8ff39))
* **topbar:** correct mobile topbar select values for directory boards ([723ad9f](https://github.com/bitsocialnet/5chan/commit/723ad9fb58b6eaa19f03b48f9e1dd80303b670d3))
* **topbar:** didn't update when subscribing to a board ([e77dd53](https://github.com/bitsocialnet/5chan/commit/e77dd53e0ef6c123247af5ba0b7365f25533f661))
* **translations:** move purge keys to end of EN locale file ([db413ba](https://github.com/bitsocialnet/5chan/commit/db413baa1df773c9c3ca928c784e9c28052814fa))
* update Plebbit.getShortAddress calls to use object parameter ([4cb3bda](https://github.com/bitsocialnet/5chan/commit/4cb3bda38c2f46029b87c2f9a6d65a8b4f9c8d63))
* update Plebbit.getShortCid calls to use object parameter format ([a57cc1e](https://github.com/bitsocialnet/5chan/commit/a57cc1e4e70bd3fb96f6b94735d4749c0f074257))
* use stable time filter for virtuoso state key in cached feeds ([1a6ac4a](https://github.com/bitsocialnet/5chan/commit/1a6ac4a2bec7423c9e8ab43561d8b6402b839c70))
* **use-default-subplebbits:** prevent state updates after unmount ([e548198](https://github.com/bitsocialnet/5chan/commit/e548198d0e5369779ae628186c83dcf8e83a5318))
* validate thread share link cid ([23f2451](https://github.com/bitsocialnet/5chan/commit/23f245145ccbfb7d692bceddc69fdeacf76e3a66))
* **views:** display useSubplebbit and useComment errors in board, post, and mod-queue views ([122b177](https://github.com/bitsocialnet/5chan/commit/122b17790a67389f60d7b171aedf20a7223adc43))
* **views:** use directory codes in document titles and fix order ([5aa1eaf](https://github.com/bitsocialnet/5chan/commit/5aa1eaf13af842ebd78b4b7cfdbe8e563fc1e700))


### Features

* add iframe challenges (e.g. mintpass) ([a7dc46f](https://github.com/bitsocialnet/5chan/commit/a7dc46fe2e768a1b872304d9b9233dcca343fb29))
* add infinite scroll for replies ([882b7b4](https://github.com/bitsocialnet/5chan/commit/882b7b4a99627e4c0e85d8ab619ac3891f6c74c9))
* add Multiboards category with /subs/ and /all/ ([12101fe](https://github.com/bitsocialnet/5chan/commit/12101fe75ec81c43413dfe6677cbc7b46b87950b))
* add redirect for non-hash URLs to support HashRouter ([dba736e](https://github.com/bitsocialnet/5chan/commit/dba736efb486a4a2b992f7233afbc9bf82d2ee5f))
* add script to automate translations ([d82bb58](https://github.com/bitsocialnet/5chan/commit/d82bb58c3eebed3db6b115cdd21abbcb2a75adff))
* **all-feed:** add NSFW/SFW filter ([6523855](https://github.com/bitsocialnet/5chan/commit/652385561bdbc52fe6956be8da6ccc338a498687))
* **board buttons:** add vote button to mobile ([d30db40](https://github.com/bitsocialnet/5chan/commit/d30db401591460d3509ef78a69251d6afc1e7d9d))
* **board header:** add banners, add support to gif banners ([07831cb](https://github.com/bitsocialnet/5chan/commit/07831cb8b026c230841d7c70d62078c35aa7e84c))
* **board header:** make subscriptions subtitle clickable to go to subs settings ([cc28224](https://github.com/bitsocialnet/5chan/commit/cc28224c91bb0716dc41165cff44b806ef4ba4f8))
* **board-buttons:** add directory-specific vote button ([af14686](https://github.com/bitsocialnet/5chan/commit/af1468669c7db81c2a28bf37f2da6fb454730784))
* **board-header:** prioritize default subplebbit title over store title ([f44b9ae](https://github.com/bitsocialnet/5chan/commit/f44b9aefbb926ece4b432606a7f9f6ed1d9bcf39))
* **board-header:** show subscription count in subscriptions view ([1675ab7](https://github.com/bitsocialnet/5chan/commit/1675ab7d407889750cdab2a77cb4d49b3c73e1cb))
* **board:** add more_threads_last_year suggestion ([e3e2599](https://github.com/bitsocialnet/5chan/commit/e3e25995d6c38ba5f98128824d1c4fbc86cbcf9b))
* **boards-list:** mark Flash, Oekaki, Artwork/Critique, Wallpapers/General as NSFW ([36bd9c5](https://github.com/bitsocialnet/5chan/commit/36bd9c5c0f6044655ae99f9fa34b34615af2f644))
* **create-board-modal:** add focus styles for close button ([eb3d672](https://github.com/bitsocialnet/5chan/commit/eb3d6729452a7a6f391fa4695ef750e36828c872))
* **crypto wallets settings:** add timestamp field ([e2149ca](https://github.com/bitsocialnet/5chan/commit/e2149ca02caf729f6d01d328105f435122b8649f))
* **crypto-wallets-setting:** add CSS-based step numbering and reorganize delete button ([dbf67f5](https://github.com/bitsocialnet/5chan/commit/dbf67f55b649fcfc6f6c0dc0579b7273e9219beb))
* **directory-modal:** add modal explaining how to submit boards to directories ([e627b6b](https://github.com/bitsocialnet/5chan/commit/e627b6b619676fa877424bf53da971a99815ebab))
* **footer:** add feedback and contact links and update styling ([0d48838](https://github.com/bitsocialnet/5chan/commit/0d488389a5d4734bf47713e9ba08b70d7b7707c7))
* **home:** add disclaimer modal for board navigation ([2a25d73](https://github.com/bitsocialnet/5chan/commit/2a25d7353c37fe73bef9b66c3f4e1bdaa8deb505))
* **home:** redesign boards list to match 4chan with filtering and catalog support ([a9690ac](https://github.com/bitsocialnet/5chan/commit/a9690ac0befba357c41595c05900efe1aa5a337e))
* **i18n:** add translations for subscriptions subtitle ([bb596bf](https://github.com/bitsocialnet/5chan/commit/bb596bff0db280cbcac0363e0b16f813ab556b5a))
* implement 5chan-specific default board list ([bae6faa](https://github.com/bitsocialnet/5chan/commit/bae6faa9291a4633b6da0b3aa0e6ced3e46a6d20))
* implement mod queue ([70ba145](https://github.com/bitsocialnet/5chan/commit/70ba14591ab1d5b541727e5d4391315d260af933))
* implement post numbers ([7684541](https://github.com/bitsocialnet/5chan/commit/76845412e8b34c11fb70bf993a0aeaeda54a3ee4))
* **mod-queue:** add minutes support to alert threshold ([ab353b5](https://github.com/bitsocialnet/5chan/commit/ab353b59f62e94edd76e97e5c18cab1f3cfb2115))
* **mod-queue:** add number column, improve time display, and use edited comments ([a33b2e5](https://github.com/bitsocialnet/5chan/commit/a33b2e5a9aa04d3ae5daf418b51b13ce6d23d579))
* **mod-queue:** add view mode selection and integrate with post components ([14e8c92](https://github.com/bitsocialnet/5chan/commit/14e8c92fa0fd2cc6eb9d5bad7646020207389373))
* **modals:** use icon-close-red.png for close buttons on home view ([21d9c0c](https://github.com/bitsocialnet/5chan/commit/21d9c0c6163dcd3947d26bcf3bdc5e5d0aae52dc))
* **moderation:** add purge action to edit menu ([1abc841](https://github.com/bitsocialnet/5chan/commit/1abc8410cd09e8d1b79df6809a9fea0241a3ae4c))
* **p2p options:** add http routers field ([3d67606](https://github.com/bitsocialnet/5chan/commit/3d676062af3ed54942a5f92b0958ce3501616c8b))
* **post-form:** display directory names in board selector ([fc79eb6](https://github.com/bitsocialnet/5chan/commit/fc79eb68d2f9400175eece2c7a468ae765126b7f))
* **post-menu:** add copy content ID button ([a1de352](https://github.com/bitsocialnet/5chan/commit/a1de352da0c58c992199e569746ed2424dcdad8f))
* **post:** add moderator and administrator role indicators ([5de2587](https://github.com/bitsocialnet/5chan/commit/5de2587cf4dbec906acd7a5b2b2332cc7ef04276))
* **post:** add pending approval label ([4023131](https://github.com/bitsocialnet/5chan/commit/402313107c1ee81b1282fec2f2aabefe49c1db6b))
* rename plebchan to 5chan ([1360dd8](https://github.com/bitsocialnet/5chan/commit/1360dd8348d309f041b3ad78e3e6789f5da243fc))
* **reply modal:** add alert when attempting multiple quotes ([c0a1b67](https://github.com/bitsocialnet/5chan/commit/c0a1b671c85c2fb9e8035f56a686c71f4c93ec43))
* **routing:** add hooks and utilities for directory-based board routing ([f485656](https://github.com/bitsocialnet/5chan/commit/f4856563df136ca84e180483d132d1005c91abc3))
* **rules:** add rules page with board selector ([d800ee9](https://github.com/bitsocialnet/5chan/commit/d800ee9817a465842870ad94983be336f18e9e3e))
* **share-link:** add description and rules link types ([41ffd2f](https://github.com/bitsocialnet/5chan/commit/41ffd2f65b7561ebdd6f1663fde0c5ecf97d1121))
* **topbar:** add customizable visibility controls for directories and subscriptions ([669bb5b](https://github.com/bitsocialnet/5chan/commit/669bb5b1815b403a4343eb507429ebfb159c44e2))
* **topbar:** add temporary show-all button for hidden directories ([5792fcd](https://github.com/bitsocialnet/5chan/commit/5792fcd31eca9c1e07eebcbae37de1ee67d1d0d8))
* **ui:** add context-aware directory modal with different content for placeholder vs create board ([5f06fdf](https://github.com/bitsocialnet/5chan/commit/5f06fdf461788453c02293c9b9b6457f5f52c786))
* **update-translations.js:** remove unused translations, add translation cleanup audit with dynamic key safety ([96c5dff](https://github.com/bitsocialnet/5chan/commit/96c5dff794bc32d14f4524bf3274afc8fba41201))
* **url-utils:** replace p/ syntax with >>> cross-board references ([c984e56](https://github.com/bitsocialnet/5chan/commit/c984e562495e58b30ec1971a14ae637ea4d4d6f8))


### Performance Improvements

* **components:** memoize post menus with minimal props ([698df59](https://github.com/bitsocialnet/5chan/commit/698df59f197eefc4f5da63fa4f98b6d7a7714ea9))
* **components:** prevent rerenders from updatingState ([fa32833](https://github.com/bitsocialnet/5chan/commit/fa32833b2a03b299196218e60c35911072f9ae80))
* eliminate redundant derived state in board and post views ([b10ada5](https://github.com/bitsocialnet/5chan/commit/b10ada55e7c7603a9d1680ee4240e120655e0798))
* **feeds:** use hasMore instead of length check for conditional virtualization ([c0c6e9e](https://github.com/bitsocialnet/5chan/commit/c0c6e9ee315e983cbe38491d7b40a231edd44e07))
* Fix unnecessary renders in useCurrentTime hook and ModQueueView footer ([404b613](https://github.com/bitsocialnet/5chan/commit/404b613b44c7a71511c08704dcec0a545234bfa1))
* **hooks:** document stable reference optimization in useDefaultSubplebbits ([e7e2a2f](https://github.com/bitsocialnet/5chan/commit/e7e2a2fda70230ea02d6ac6e184c8bc9ffb48373))
* implement LRU-cached persistent feed mounting to eliminate Virtuoso flash ([896ca4a](https://github.com/bitsocialnet/5chan/commit/896ca4ad13072f38fbb1e81e9f2147ed99cbe009))
* isolate IPFS state updates in board and catalog views to prevent excessive re-renders ([eb8e226](https://github.com/bitsocialnet/5chan/commit/eb8e226ff151e4c716297e81e0358e840195f5c9))
* migrate from vite to rolldown-vite for faster builds ([10a266c](https://github.com/bitsocialnet/5chan/commit/10a266ceaba05ee33bb10be573167a37b7637101))
* **mod queue:** conditionally virtualize table for large feeds ([951a8ff](https://github.com/bitsocialnet/5chan/commit/951a8ffd84223fd5ace0b71d196d55d8cb2522d3))
* **mod queue:** prevent re-renders from IPFS client state changes ([33943c3](https://github.com/bitsocialnet/5chan/commit/33943c3de9e53d444cb24d519b03d2c204c5e2f6))
* **mod queue:** skip animation sync when no items need blinking ([4900410](https://github.com/bitsocialnet/5chan/commit/49004109f8ab5f93d228687dd103e47b612e5574))
* only virtualize replies when count exceeds first page size ([2b8d6f4](https://github.com/bitsocialnet/5chan/commit/2b8d6f4fceea040daa6865fbab77cb2dcaa85671))
* pre-optimize workbox dependencies to prevent dev server reload ([ac19034](https://github.com/bitsocialnet/5chan/commit/ac19034ac4f94e015716938358d94482fa2b599a))
* preload theme button and background images on app startup ([d46d7ed](https://github.com/bitsocialnet/5chan/commit/d46d7edffe89e51d6972a9d8a82834b89140328f))
* prevent unnecessary re-renders from RPC client state changes ([3799dcc](https://github.com/bitsocialnet/5chan/commit/3799dccd88285cdee8c3bc9417f262c4aa1f53fb))



## [0.5.3](https://github.com/bitsocialnet/5chan/compare/v0.5.2...v0.5.3) (2025-07-29)


### Bug Fixes

* **pending post page:** prevent crash and ensure redirect to "not found" on invalid URL ([7374465](https://github.com/bitsocialnet/5chan/commit/7374465c4f121313054aec962c567e243c8ac61e))
* prevent TypeError when challengeErrors is not iterable in challenge verification ([b2e1dd5](https://github.com/bitsocialnet/5chan/commit/b2e1dd54a4022add5dce744f796c5f5b07cd127f))
* resolve @libp2p/utils version conflict causing build failures ([4dbe751](https://github.com/bitsocialnet/5chan/commit/4dbe7512724ef91b41f695d57c56c2a70e5102df))



## [0.5.2](https://github.com/bitsocialnet/5chan/compare/v0.5.1...v0.5.2) (2025-06-04)


### Bug Fixes

* **board header:** subplebbit address could be too long ([bc80533](https://github.com/bitsocialnet/5chan/commit/bc805337400c5233e829c823606d8a0401bedf94))
* **catalog search:** use query parameter so users can share searches and link to them ([6075b2e](https://github.com/bitsocialnet/5chan/commit/6075b2ebf7b7bcfc6e3bcb57dec4bb53988f658f))
* **challenge modal:** on mobile the modal was incorrectly positioned on top left ([bb0fcb9](https://github.com/bitsocialnet/5chan/commit/bb0fcb9c1a97d2dac7ed08544bb406d3d99f0bba))
* **mod multisub:** mod page was missing post form ([339a9bc](https://github.com/bitsocialnet/5chan/commit/339a9bc18a6ca4414a9b80f85b5d12799f68cf94))


### Features

* **board:** add search bar to board page, redirect to catalog view ([53e0482](https://github.com/bitsocialnet/5chan/commit/53e04823df833bb376770892d1f51b0ecbdaa8c8))
* **markdown:** render plebchan links as internal links, so the user doesn't have to leave the app ([b3bcd58](https://github.com/bitsocialnet/5chan/commit/b3bcd5896c8880fdcb99423baaf3bab9be705921))



## [0.5.1](https://github.com/bitsocialnet/5chan/compare/v0.5.0...v0.5.1) (2025-06-03)


### Bug Fixes

* **android:** resolve fullscreen overlay preventing user interaction ([c3ca0c3](https://github.com/bitsocialnet/5chan/commit/c3ca0c330dd55db7c33733ecf48616db3fe35822))
* **electron:** app couldn't copy share links to clipboard ([104c9c0](https://github.com/bitsocialnet/5chan/commit/104c9c0eba2b4e3668911d49ae66a51c516fe0b5))
* errors could be displayed unnecessarily ([9fbfcb3](https://github.com/bitsocialnet/5chan/commit/9fbfcb3630a4231d240a6582cf3645184d8e1e19))
* **reply:** no need to render deleted replies that have no children ([f233da9](https://github.com/bitsocialnet/5chan/commit/f233da98069ea1b6f38543cca0ebbeefa43dc19a))



# [0.5.0](https://github.com/bitsocialnet/5chan/compare/v0.4.0...v0.5.0) (2025-05-22)


### Bug Fixes

* **electron:** catch stream errors (e.g. ECONNRESET) in IPFS downloader and add retry logic ([694b01b](https://github.com/bitsocialnet/5chan/commit/694b01b8e3d73a7a9e7fb6799c1221546e2183a2))
* **markdown:** use rehype-raw for spoiler tag parsing instead of string replacement ([45e9482](https://github.com/bitsocialnet/5chan/commit/45e94822417c75c87c6a09e11cdb2a971f5c5807))
* **pending post:** page could redirect to "not found" if pending post failed ([b50df69](https://github.com/bitsocialnet/5chan/commit/b50df69cf3499eb8facea1475b99b85362468681))



# [0.4.0](https://github.com/bitsocialnet/5chan/compare/v0.3.6...v0.4.0) (2025-03-07)


### Bug Fixes

* **board header:** banner could change while subplebbit is loading ([2df9a96](https://github.com/bitsocialnet/5chan/commit/2df9a964e65cf7d8968ba28d470dcf7aba58b979))
* **board:** loading state wasn't showing in description page ([319d374](https://github.com/bitsocialnet/5chan/commit/319d37481044e2c7d99ac48ed94962c440558bd5))
* **catalog:** embedded images that 404'd could overflow ([9013cb0](https://github.com/bitsocialnet/5chan/commit/9013cb02fe58655f164eb5862b1a8d3e4121d78a))
* **css:** floating-ui portal could override app color scheme ([fc674f4](https://github.com/bitsocialnet/5chan/commit/fc674f4caf755bb3667a70f6735ae39003e17932))
* **reply modal:** dragging modal could select text behind it ([2d1fb69](https://github.com/bitsocialnet/5chan/commit/2d1fb69f02fcb05d9906c0f37a1766df489f8cff))


### Features

* add p/mod feed for all subs the user moderates ([ba5753d](https://github.com/bitsocialnet/5chan/commit/ba5753d85e347b248df962bdcd6f4231f44716a7))
* **catalog filter:** add filtering with complex patterns, including regex, help modal ([d7a9c16](https://github.com/bitsocialnet/5chan/commit/d7a9c1640babd5b468e7551ead4280a6f4819390))
* **catalog filters:** add color highlighting of threads matching pattern ([22b828b](https://github.com/bitsocialnet/5chan/commit/22b828b3e834fdd6ce5658af1457792403793394))
* **catalog filters:** add filter by user address, display name or anonymous, mod role ([70f640e](https://github.com/bitsocialnet/5chan/commit/70f640ecca6440ffcc7239f2c9da105adcf1640a))
* **catalog:** add catalog filters ([b127876](https://github.com/bitsocialnet/5chan/commit/b127876ce4798d34448940ad14e82f2b161a0db7))
* **catalog:** add search ([a8f7de7](https://github.com/bitsocialnet/5chan/commit/a8f7de7d85dcf33adec0b0a4e8f17a42949b5f4a))
* **edit menu:** alert "you cannot edit this thread/reply" if without permission ([377d8cd](https://github.com/bitsocialnet/5chan/commit/377d8cdffaec7b0efbbb1dfa77b2944b34498ed5))
* **embeds:** add support to youtube shorts ([306e7b0](https://github.com/bitsocialnet/5chan/commit/306e7b081ff72a2acfbe629e1f7ebc0f7ba432de))
* **post:** when attempting to reply, alert reply or thread was deleted or removed ([0a7cda3](https://github.com/bitsocialnet/5chan/commit/0a7cda31bfe64986fb34788e71868ccd59bc1fad))
* **settings:** auto-subscribe imported accounts to default subs and moderated subplebbits ([0f38fb3](https://github.com/bitsocialnet/5chan/commit/0f38fb3ae711dcea1ec317aae2fe93231e85c9e3))


### Performance Improvements

* **app:** optimize loading times by using stored values of subplebbits and comments instead of fetching them multiple times ([8557ebb](https://github.com/bitsocialnet/5chan/commit/8557ebb3a73b2c62965f9f48473f5903d15425cd))
* **catalog:** each post in the feed was loading a comment needlessly ([64f984d](https://github.com/bitsocialnet/5chan/commit/64f984d2d0d85fbb8bc6b20672723c1b45a590cf))
* **feed:** optimize posts rendering via props refactoring, memoizations ([797a1f2](https://github.com/bitsocialnet/5chan/commit/797a1f23c69374ce09b7a1ed7914e40e29acc4ca))
* prioritize cached data from API, improving navigation speed and memory consumption ([dcb05ed](https://github.com/bitsocialnet/5chan/commit/dcb05ed3a04212b5e140ed42fa0e4bbed810781e))
* **reply-modal:** fix laggy dragging during post loading with GPU-accelerated gestures ([0caa8f9](https://github.com/bitsocialnet/5chan/commit/0caa8f9e70cdaea6769dbb4e7bb52f7046479b61))



## [0.3.6](https://github.com/bitsocialnet/5chan/compare/v0.3.5...v0.3.6) (2025-02-23)


### Bug Fixes

* **feed:** "no posts" could appear in an empty board after the user published to it ([588d9fb](https://github.com/bitsocialnet/5chan/commit/588d9fbdb09966730b9999c2556a792156b8d976))
* **post:** image marked as spoiler was visible ([6e60360](https://github.com/bitsocialnet/5chan/commit/6e60360033355877b02a61e691d1f4f89f1de0f1))
* **post:** loading string could appear in floating posts from out-of-view quotes ([9d454b4](https://github.com/bitsocialnet/5chan/commit/9d454b489c655c3e3575b83e98435c470503aeb5))


### Features

* **catalog:** show posts published by account instantly in feed ([628115f](https://github.com/bitsocialnet/5chan/commit/628115f19871fa8e381e4a1fcd6eed82f24ed252))



## [0.3.5](https://github.com/bitsocialnet/5chan/compare/v0.3.4...v0.3.5) (2025-02-20)


### Bug Fixes

* **markdown:** lists could overflow next to thumbnail ([7172be4](https://github.com/bitsocialnet/5chan/commit/7172be4960553307350d2a5d41d6b7d54f814010))
* **offline indicator:** increase offline check by 1 hour ([23ce86c](https://github.com/bitsocialnet/5chan/commit/23ce86c08f5146d3d00ac07ded5201ea3565aacb))
* **pending post:** invalid pending post index would break the view, redirect to not found instead ([92e742a](https://github.com/bitsocialnet/5chan/commit/92e742a7570ba6db47b34550270538c69c2548a2))


### Features

* auto subscribe new accounts to specific default subplebbits ([882703b](https://github.com/bitsocialnet/5chan/commit/882703b00d67b782d1329ee1135dda27113e9aae))
* **topbar:** add temporary links to "create board" and "vote" buttons ([57fc2bb](https://github.com/bitsocialnet/5chan/commit/57fc2bbfc282bf754e16f5caba2679279e00296b))


### Performance Improvements

* **topbar:** optimize scroll up/down animation with GPU acceleration ([31c3482](https://github.com/bitsocialnet/5chan/commit/31c3482831751da49bcbea1f0bbb0d2cac48fa8d))



## [0.3.4](https://github.com/bitsocialnet/5chan/compare/v0.3.3...v0.3.4) (2025-02-05)


### Bug Fixes

* **account settings:** creating new account didn't automatically switch to it ([382e069](https://github.com/bitsocialnet/5chan/commit/382e0692c16b65eb4f3758a095d0a83fbc60b1e1))
* **board:** some subplebbit avatars could overflow ([4f2308f](https://github.com/bitsocialnet/5chan/commit/4f2308fa94fb113b33f39e435e1d324b5adb8f54))
* **challenge modal:** user could submit empty answer ([a7beb3a](https://github.com/bitsocialnet/5chan/commit/a7beb3aebb3997ec5d0ce1d6b6270d560cd93927))
* emptying fields could fail when publishing reply ([7ffb3ce](https://github.com/bitsocialnet/5chan/commit/7ffb3ce8c5ef5f898c615292a74e50bfb97989e0))
* **interface setting:** improve wording ([88a5782](https://github.com/bitsocialnet/5chan/commit/88a5782118759039577cb647b0a880c7787f3b8f))
* **post:** an hr element written in markdown could get rendered as a UI hr ([165b950](https://github.com/bitsocialnet/5chan/commit/165b9504225b252d7de0d1a8608be471bdd2f12a))
* **post:** content could bypass max character count if posted from other plebbit client ([b9210dc](https://github.com/bitsocialnet/5chan/commit/b9210dc835fa7dcbdf0d31b7173bf7c675b25655))
* **post:** prevent edit menu checkbox from being interactable while post is loading ([96794a0](https://github.com/bitsocialnet/5chan/commit/96794a0c1e1d5bd8278b6c321a9ae24a5761210b))
* **post:** title would wrap incorrectly in posts with no image/thumbnail ([0e67960](https://github.com/bitsocialnet/5chan/commit/0e6796002c27af53fd3b8d9bfe4a9e94a62801da))
* **reply modal:** changing anon mode before publishing reply didn't work ([2a20716](https://github.com/bitsocialnet/5chan/commit/2a20716212708e0ddd7cb3a036a34f223c2c9159))
* **reply:** media thumbnail wasn't showing ([be2b65b](https://github.com/bitsocialnet/5chan/commit/be2b65b5856e463dc9e770125118472b960a3a93))
* **subplebbit:** subplebbit could erroneously appear offline while publishing a post ([48a8046](https://github.com/bitsocialnet/5chan/commit/48a80464862f618d86d57bd3e8859077499b994a))
* **theme:** christmas theme should only run on dec 24 and 25 ([cbed83c](https://github.com/bitsocialnet/5chan/commit/cbed83cd1098031113009db4fa41f522f0536584))
* **theme:** prevent special theme from persisting outside holiday period ([65ed3df](https://github.com/bitsocialnet/5chan/commit/65ed3dffd5ac3af227d736d686f410692ce31e53))
* **topbar:** only display the top 15 subs in the default list ([0488a6c](https://github.com/bitsocialnet/5chan/commit/0488a6c629402f0c6acff09f2a9090abe07b2c4d))


### Features

* **account settings:** add hash-based routing for settings categories ([c21d512](https://github.com/bitsocialnet/5chan/commit/c21d512958fbda8bac95c9ed3f6f2850bcbd3f7b))
* **boards list:** add filter by tag ([0716aac](https://github.com/bitsocialnet/5chan/commit/0716aac9e2ecdfb1de709c411b1f952012ae1f37))
* **boards list:** add PPH column ([d858b53](https://github.com/bitsocialnet/5chan/commit/d858b5398d7c4bd4810662bf42d4fc4d87c433b1))
* **boards list:** show 15 boards at a time + p/all, add load more button ([cf849ba](https://github.com/bitsocialnet/5chan/commit/cf849bab7047cb224b928dcce2217833312c5363))
* **challenge modal:** close with escape key ([515007c](https://github.com/bitsocialnet/5chan/commit/515007cbf61feb33b7c7720a972c9c08a6fc9835))
* **home:** add boards list more similar to vichan, which is better than 4chan's boards box for a potentially infinite number of boards ([cadfc69](https://github.com/bitsocialnet/5chan/commit/cadfc699fcf5b9370bdddd04f6e7261703923cca))
* **markdown:** add spoiler text ([9a08b95](https://github.com/bitsocialnet/5chan/commit/9a08b9572b80dd16998422fbf3246b61c86b8d4b))
* **post form:** add content length check ([1b359f9](https://github.com/bitsocialnet/5chan/commit/1b359f9d7b1c095c73690aec736cd6928c251e53))
* **post:** support youtube links from Invidious instances ([9d9ba61](https://github.com/bitsocialnet/5chan/commit/9d9ba61a919ab9ecc2186a144dd4a4e411939bcb))
* **reply modal:** add content length check, better error display ([d861f89](https://github.com/bitsocialnet/5chan/commit/d861f894f1dea9d2b532985e74370617b03a56ac))
* **reply modal:** close with escape key ([63cb5b6](https://github.com/bitsocialnet/5chan/commit/63cb5b6591ed846ec0c87ea312109a5b325c3e52))
* **settings modal:** close with escape key ([01e467d](https://github.com/bitsocialnet/5chan/commit/01e467d0699dfc14f68dacf0f843f5c71755220e))
* **settings:** add subscriptions setting ([85d2cb6](https://github.com/bitsocialnet/5chan/commit/85d2cb67a97efd3d32ab9bcfd5ad7a052e0d14ba))



## [0.3.3](https://github.com/bitsocialnet/5chan/compare/v0.3.2...v0.3.3) (2024-12-25)


### Bug Fixes

* snow effect shouldn't show on mobile ([5284b3d](https://github.com/bitsocialnet/5chan/commit/5284b3da1be0807ef86ab0d97627e58c8e4784ae))



## [0.3.2](https://github.com/bitsocialnet/5chan/compare/v0.3.1...v0.3.2) (2024-12-24)


### Bug Fixes

* **avatar settings:** add timestamp field to let users add existing signature ([16c8f39](https://github.com/bitsocialnet/5chan/commit/16c8f39add8231df00c261891ee80ca312fc66a2))
* **board stats:** while stats load, show ? as values instead of showing nothing (causing displacement) ([c40c9e4](https://github.com/bitsocialnet/5chan/commit/c40c9e4df559bda5528e415e066940388e798005))
* **electron:** auto restart script more reliable ([b05c6ed](https://github.com/bitsocialnet/5chan/commit/b05c6ed94f61fa94fd233033c4be056a55bc1e23))
* **electron:** ipfs proxy should have error status code ([d608a46](https://github.com/bitsocialnet/5chan/commit/d608a46b00303dc2a5f0b7c9a4e40f62f6beaf1d))
* **ellipsis animation:** dots could appear cut off and cause displacement changing width of string ([09505a6](https://github.com/bitsocialnet/5chan/commit/09505a62313fcf26de4a1e84d7f705eee714bd33))
* **feed post:** gif thumbnail could break persistently ([e3cf507](https://github.com/bitsocialnet/5chan/commit/e3cf5076be0488a70473c1902902bf22170c9305))
* **feed:** posts could change position causing displacement ([309f766](https://github.com/bitsocialnet/5chan/commit/309f76689f3672436bc790894af4580006a4c60f))
* **home:** stats should load regardless of the total number of online subs ([8b7730b](https://github.com/bitsocialnet/5chan/commit/8b7730b6c4f074edff602d645647d3854171a4f2))
* **markdown:** invalid urls in content could crash the app ([73bab13](https://github.com/bitsocialnet/5chan/commit/73bab13e34302e97b3288f9e06cee681546ab417))
* **plebbit options:** schema error prevented to save ([db8c51f](https://github.com/bitsocialnet/5chan/commit/db8c51fa72404b00bc1bc90d4e92b2e3ad5887c5))
* **post:** deleted or removed post could show reply form ([0043e2b](https://github.com/bitsocialnet/5chan/commit/0043e2bdb6f86ac82278889ee18a290abd5f24fa))
* **post:** error was displayed incorrectly ([fd8b3ea](https://github.com/bitsocialnet/5chan/commit/fd8b3ea2e9d16aeb81d08e73a2d7d6394568c555))
* **post:** image could flicker when clicking it to expand it ([077b3bc](https://github.com/bitsocialnet/5chan/commit/077b3bc9efe25938bb3798424fe7156ba840b9b0))
* **post:** long text content wouldn't wrap around images ([0944094](https://github.com/bitsocialnet/5chan/commit/094409439215f7b42ab7b9eef704e96375149cb0))
* **reply:** don't show backlink for deleted or removed reply ([d6d2831](https://github.com/bitsocialnet/5chan/commit/d6d2831b465ffbedb08294f4d894feb69ac0391a))
* **settings:** crypto address setting would show error for an already set address ([cc660e9](https://github.com/bitsocialnet/5chan/commit/cc660e9527468de04c1b826c9d97b863ebd2f2eb))
* **time filter:** last visit time filter could be a duplicate in dropdown ([9ee6966](https://github.com/bitsocialnet/5chan/commit/9ee6966c26c848ad8c6bab4117f6316b90e29e9c))


### Features

* add christmas theme ([eb3a630](https://github.com/bitsocialnet/5chan/commit/eb3a630cc360a650e178eee6e8d5aad85ee93197))
* **electron:** add http routers to electron ([521d26b](https://github.com/bitsocialnet/5chan/commit/521d26bbe387794008a5309b9e30eadb418c9299))
* **p/all:** improve design of "show more posts" button in feed footer ([1cc8d9a](https://github.com/bitsocialnet/5chan/commit/1cc8d9acbe86d059564622a8908f61bbc1abdb53))
* **post:** enable highlighting an already highlighted post by using a different color ([5a498cb](https://github.com/bitsocialnet/5chan/commit/5a498cbcb656704c2147c08ab942b45636498165))
* **reply modal:** add spellcheck for the content, excluding the c/cid at the top ([9ec308b](https://github.com/bitsocialnet/5chan/commit/9ec308bcc28215ce8346dee55892337da79e16db))


### Performance Improvements

* **index.html:** preload UI assets ([73f9d9e](https://github.com/bitsocialnet/5chan/commit/73f9d9eb53221183f1d058b0f4a4b748322e37c9))



## [0.3.1](https://github.com/bitsocialnet/5chan/compare/v0.3.0...v0.3.1) (2024-11-10)


### Bug Fixes

* **moderation:** update to use new API schema ([e9fc47b](https://github.com/bitsocialnet/5chan/commit/e9fc47be201772a1f1fc55e7ce0dd567bc5deb81))
* **post:** some quotes to replies wouldn't show quoted posts on hover ([965c6f8](https://github.com/bitsocialnet/5chan/commit/965c6f846a27b22f86254ceb43ec0e18d6fecaf7))



# [0.3.0](https://github.com/bitsocialnet/5chan/compare/v0.2.9...v0.3.0) (2024-11-08)


### Bug Fixes

* **board:** account comments couldn't appear instantly in feed ([0b92c60](https://github.com/bitsocialnet/5chan/commit/0b92c60f3453f1b2541f352aad2378dd4afdc9b4))
* **board:** virtuoso footer would overflow ([8d35e09](https://github.com/bitsocialnet/5chan/commit/8d35e0942f65553052c421c79f37d26b4da2a0ca))
* **p/all:** empty 24h feed would not show 'show more posts since last week' ([82217a7](https://github.com/bitsocialnet/5chan/commit/82217a726c787323a42ac04978624a3f72251d67))
* **post menu:** link to other clients was broken on description post ([c2363fe](https://github.com/bitsocialnet/5chan/commit/c2363fe03b86fafe2d5cfc6da14fecaa458cce80))
* **post:** hidden post showed its content ([a2dd3ef](https://github.com/bitsocialnet/5chan/commit/a2dd3efe087637e8dfd5b3fda3cba11605add1c2))
* **reply:** hidden reply was too big and showed edit menu checkbox ([a927f3a](https://github.com/bitsocialnet/5chan/commit/a927f3aa0070afd63f8540c231ed79252692c16b))


### Features

* **android app:** add 'choose file' button to auto upload media to catbox in the background ([f40c2c2](https://github.com/bitsocialnet/5chan/commit/f40c2c2f8816f6d12c320da36ad71ac5f76fcbef))
* **interface settings:** add 'Fit expanded images to screen' setting ([ba54d70](https://github.com/bitsocialnet/5chan/commit/ba54d70421ad257f0ba31cbc2d5d5a5a72030d02))
* **reply modal:** add 'choose file' button on android ([5c09b66](https://github.com/bitsocialnet/5chan/commit/5c09b66338417db0ad448fc3a164951bc7cb29d3))
* **reply modal:** display errors in modal ([5768443](https://github.com/bitsocialnet/5chan/commit/57684438a5fd7941c6974711c627e372aa564c5e))



## [0.2.9](https://github.com/bitsocialnet/5chan/compare/v0.2.8...v0.2.9) (2024-10-29)


### Bug Fixes

* **catalog:** if time filter is 'bump order', it should say 'last bumped' instead of 'newer than' ([71ba306](https://github.com/bitsocialnet/5chan/commit/71ba306ec12cc9a31f1a52b26348f52c620fae2f))
* **embed:** reddit links have to include '/comments/' to be embeddable ([5e6c9fb](https://github.com/bitsocialnet/5chan/commit/5e6c9fba7e4ee14d80d041327dff12def20d4b87))
* **p/all:** auto time filter didn't show posts from last visit ([0b5aa7d](https://github.com/bitsocialnet/5chan/commit/0b5aa7dc31afdd49ff8a5470e2d1312d9f2f3d8b))
* **release.yml:** wrong java version prevented apk build ([f280f33](https://github.com/bitsocialnet/5chan/commit/f280f33556c1fccfddb018c6ded53df492c67488))
* **router:** a link could include '%23' instead of '#' ([360dfb4](https://github.com/bitsocialnet/5chan/commit/360dfb4604bde8c4dc5459f849a40a063c1c58ec))



## [0.2.8](https://github.com/bitsocialnet/5chan/compare/v0.2.7...v0.2.8) (2024-10-19)


### Bug Fixes

* **android:** update app logo ([4ef3f9d](https://github.com/bitsocialnet/5chan/commit/4ef3f9de7d19c2a86dd8d0e50c349472f1da19aa))
* color missing, translation missing ([0705bd9](https://github.com/bitsocialnet/5chan/commit/0705bd9dbd7784ea3d57d2f5903225985e9a210a))
* **crypto address setting:** default description didn't appear, clicking 'check' with address already set would result in error ([ff3f5f6](https://github.com/bitsocialnet/5chan/commit/ff3f5f618d67845373b7cc1337ea0a796c331265))
* **electron:** empty error message would appear after closing app ([83fdd8e](https://github.com/bitsocialnet/5chan/commit/83fdd8eb09be8acf7e422abd4b7aa0d1c4452fc2))
* **electron:** missing isElectron flag ([3720ed2](https://github.com/bitsocialnet/5chan/commit/3720ed2d2ee03742926a21521add06e38e271d1a))
* **feed:** old account comments could appear at the top of the feed ([c2aa9ca](https://github.com/bitsocialnet/5chan/commit/c2aa9cad49f5c78da535c7cd3e7e5cc135737377))
* **post:** a non-direct link could be marked as media instead of webpage ([e9280ac](https://github.com/bitsocialnet/5chan/commit/e9280ac84c5151fcb8d76b04b746d80e6850e0a8))
* **post:** some links to images could be embedded as videos ([46e1189](https://github.com/bitsocialnet/5chan/commit/46e1189711c1e345afd7f85b8026017fd2550c2b))
* **publish reply:** error "content is an empty string" could appear ([af7505c](https://github.com/bitsocialnet/5chan/commit/af7505c45f3196ee21b3fdd5d70411538a05bcea))
* **topbar:** mobile animation on scroll was too slow ([8e245a4](https://github.com/bitsocialnet/5chan/commit/8e245a47598913ad816b84af71572236688d9497))


### Features

* **account settings:** alert user account is stored locally and specify location ([89d37dc](https://github.com/bitsocialnet/5chan/commit/89d37dc029120cdacf2b68eeddf247049e379164))
* **android:** fetch thumbnail image from any webpage link ([6f8a6e3](https://github.com/bitsocialnet/5chan/commit/6f8a6e38d49adff7252287268db512d792e448be))
* **board:** suggest user to switch time filter on p/all and p/subscription if there aren't enough posts ([eac0a01](https://github.com/bitsocialnet/5chan/commit/eac0a0150ca45412990660498cfc08ac961631f5))
* **catalog post:** add thumbnail fetching for sites with cors access ([3556a04](https://github.com/bitsocialnet/5chan/commit/3556a042803ecf9a580ea16bf9e69dd03be526b6))
* **catalog:** add warning to switch filter if there aren't enough posts in p/all and p/subscriptions ([ba9496c](https://github.com/bitsocialnet/5chan/commit/ba9496ca4210d5e86277ea4dbf801a1614371294))
* **embed:** add support to music.youtube.com ([03dbf95](https://github.com/bitsocialnet/5chan/commit/03dbf958f61df005b0556a680551ed359f467e34))
* **embed:** add support to youtube playlists ([492d979](https://github.com/bitsocialnet/5chan/commit/492d979cf9746ab032230c832756516170693744))
* **post:** add client-side thumbnail fetching for websites with CORS access ([561e395](https://github.com/bitsocialnet/5chan/commit/561e395256fa178af1ac28011132f7dc8b39f189))
* **post:** support thumbnails from non-direct imgbb links ([9e24ae0](https://github.com/bitsocialnet/5chan/commit/9e24ae0aed435d1aeec8d9f7ba6e4b5c268e77b4))


### Performance Improvements

* **gifs:** cache first frame so gifs don't reload all the time when navigating ([73e12cc](https://github.com/bitsocialnet/5chan/commit/73e12ccbae85595ea81d06a73db0055319e841bf))



## [0.2.7](https://github.com/bitsocialnet/5chan/compare/v0.2.6...v0.2.7) (2024-09-21)


### Bug Fixes

* **post:** deleted or removed posts appeared collapsed like replies ([d3af6c2](https://github.com/bitsocialnet/5chan/commit/d3af6c2a44f0a868a07e57822369af62bf015d1e))
* **post:** deleted or removed replies should not be collapsed if edit reason is provided ([994c667](https://github.com/bitsocialnet/5chan/commit/994c667819266c14c4bcdba5c3738665245e9f09))



## [0.2.6](https://github.com/bitsocialnet/5chan/compare/v0.2.5...v0.2.6) (2024-09-20)


### Bug Fixes

* **anon mode:** refreshing page could generate a new anon address for thread ([f247f0e](https://github.com/bitsocialnet/5chan/commit/f247f0e995e1c3a3daadd0ba8528ee1fea209f62))
* **anon mode:** user id could change for pending post, name field could bug out ([bb97640](https://github.com/bitsocialnet/5chan/commit/bb976409ff425097187db3a9679a0b80464aa0c9))
* **banner:** border was missing in some themes ([9a4e62b](https://github.com/bitsocialnet/5chan/commit/9a4e62bd19d27a410f0210231572f482ae1a2ab1))
* **board:** show description even if there are no posts ([72f0c79](https://github.com/bitsocialnet/5chan/commit/72f0c79922b2e1dec60de8e236d2094685561b9f))
* **catalog filters:** clicking "save" button didn't close the modal ([ea42d5d](https://github.com/bitsocialnet/5chan/commit/ea42d5d46c0633168a9556a13555151a2b28ab05))
* **catalog:** greentext and markdown styling shouldn't appear ([7742e1c](https://github.com/bitsocialnet/5chan/commit/7742e1c9b03f09912162a84d6caf26fb7ae4db88))
* **edit menu:** modal could appear opaque ([b18c1bc](https://github.com/bitsocialnet/5chan/commit/b18c1bc4914c1371bc07ac5c48a06e6f05858b2c))
* p/all description showed "undefined" in window title ([d5dcedf](https://github.com/bitsocialnet/5chan/commit/d5dcedf3bdb109547097851d4717cc1853b1fd4b))
* **popular threads box:** don't display markdown syntax, remove white space ([2db5009](https://github.com/bitsocialnet/5chan/commit/2db5009911982482fadbbb2381db23192ae15452))
* **post form:** emptying out the fields and posting could result in "empty string" error ([f80f636](https://github.com/bitsocialnet/5chan/commit/f80f6369a5d8a57b239dfadf91abc5da219d7abb))
* **post menu mobile:** "view on" links were broken ([2390238](https://github.com/bitsocialnet/5chan/commit/2390238a10ba1d21e5bdd473627c837b13d6a31b))
* **post:** "(You)" wasn't appearing for comments published in anon mode by user ([7d2bd38](https://github.com/bitsocialnet/5chan/commit/7d2bd38f58d45e615a28b2fbd5a7ba6f58247d01))
* **post:** anon ID could be wrong while post is pending ([e068db9](https://github.com/bitsocialnet/5chan/commit/e068db97438a73eadee83a87c20b3552e08fb0f2))
* **post:** incorrect spacing on enlarged images ([5bcfda6](https://github.com/bitsocialnet/5chan/commit/5bcfda6908301a06a1518a9d51f27648dc8f31dd))
* **post:** special characters in content could overflow ([c1910c9](https://github.com/bitsocialnet/5chan/commit/c1910c97888df4616cb765f7a00497796b2e03df))
* **theme:** changing theme wouldn't work in pending post page ([5f55ade](https://github.com/bitsocialnet/5chan/commit/5f55adef07895371fa63c44376061dcaa9b067d7))


### Features

* **catalog filters:** add "filtered threads" count ([b38948b](https://github.com/bitsocialnet/5chan/commit/b38948bbc9c1cd1cc1b4f76b93031a4b7576c954))
* **post form:** alert user when submitting a post without media ([3c27fd6](https://github.com/bitsocialnet/5chan/commit/3c27fd6c3131c0a1d624bc9c9d34bc583d4345db))
* **post:** add support for next.js image links ([5a9bf5b](https://github.com/bitsocialnet/5chan/commit/5a9bf5b88bd805e9b729b70d5fd4d69c39ff99fb))
* **post:** show media dimensions if available ([4664206](https://github.com/bitsocialnet/5chan/commit/4664206e77c0331cd827a4cfa1e400d4e2922105))
* **reply modal:** add autofocus on mobile ([c58a6bc](https://github.com/bitsocialnet/5chan/commit/c58a6bceec0285710e1348f11eadcef98f0e41b8))


### Performance Improvements

* **catalog:** optimize filtered feed ([6e472b2](https://github.com/bitsocialnet/5chan/commit/6e472b2b17fb7b94790388567eb061e8f164a8e7))


### Reverts

* **catalog:** disable catalog filters temporarily, they don't perform well with api ([cadf416](https://github.com/bitsocialnet/5chan/commit/cadf4160587712cdec5d63212c53f8dd2d698c41))



## [0.2.5](https://github.com/bitsocialnet/5chan/compare/v0.2.4...v0.2.5) (2024-09-06)


### Bug Fixes

* **board buttons:** buttons would wrap incorrectly on small window width ([385acb0](https://github.com/bitsocialnet/5chan/commit/385acb08fd24eff3dac4d1f029817ceb28597f4e))
* **catalog post preview:** special characters were able to overflow ([48b55ed](https://github.com/bitsocialnet/5chan/commit/48b55ed972e8d20d108086175b7838f43d2983a6))
* **catalog:** p/all description would show while filter to hide threads without images is turned on ([5d2e28e](https://github.com/bitsocialnet/5chan/commit/5d2e28eb5b7dd508597dfd83ee4d9f2b464864a1))
* **edit menu:** checkbox would appear dark in floating post from quote ([c354d72](https://github.com/bitsocialnet/5chan/commit/c354d72e0ac561291a44822ad9f84e7d8c02059b))
* **edit menu:** couldn't edit post content if post was just published ([9543f16](https://github.com/bitsocialnet/5chan/commit/9543f16f683d2d90041edab895a571d30a30baae))
* **edit menu:** modal position would bug out when resizing textarea to edit post content ([4858cea](https://github.com/bitsocialnet/5chan/commit/4858ceadc98ee367c1d81a59dce67a4c78b3df10))
* **edit menu:** remove autofocus, it caused auto scroll ([e9c7e86](https://github.com/bitsocialnet/5chan/commit/e9c7e868f245ec803823ca372d848debf96d9376))
* **edit menu:** textarea to edit content was too small ([d52c29f](https://github.com/bitsocialnet/5chan/commit/d52c29f78148fa2641c5abadd3856a10e4ae492d))
* **home:** "use catalog" button didn't work for some addresses ([5c846fc](https://github.com/bitsocialnet/5chan/commit/5c846fcdc8a23ead278868c92bc6c9443ea231c8))
* **home:** options modal flickered when clicked twice ([30b9152](https://github.com/bitsocialnet/5chan/commit/30b91521b9a3e4daef86f696b18addb7149bcff8))
* **markdown:** don't allow horizontal lines, they look confusing inside of post content ([1eb64ed](https://github.com/bitsocialnet/5chan/commit/1eb64ede3dfba50b9e77d47c9c4dd7f8d3db4c5d))
* **markdown:** single returns would be rendered as spaces ([495e9e2](https://github.com/bitsocialnet/5chan/commit/495e9e25b5f5cdb19661318f552d1b2908fba987))
* **markdown:** users couldn't include empty lines in the post content ([38790a2](https://github.com/bitsocialnet/5chan/commit/38790a25966aea4217550d76ef1766bd2c5abefd))
* **pending post page:** opening settings would change theme ([5095e0e](https://github.com/bitsocialnet/5chan/commit/5095e0e3b9cc27b0a998a4bd646a613e69f6a0e5))
* **pending post:** "[Reply]" button and post menu shouldn't be clickable ([0cb386c](https://github.com/bitsocialnet/5chan/commit/0cb386cf662a570c3dd5772ec50bdbba56243618))
* **popular threads box:** in each post content, one return would appear as two returns (empty lines) ([cfe8686](https://github.com/bitsocialnet/5chan/commit/cfe8686d94c6ad0df05fe6a240ef25b1840429be))
* **post form:** opening settings would close post form ([17f57a1](https://github.com/bitsocialnet/5chan/commit/17f57a1d7d0fa47aa6f5fa97c803063734615173))
* **post form:** user could post empty comment using spaces ([3d2d510](https://github.com/bitsocialnet/5chan/commit/3d2d510259b0e7ac4bcfecdff872d928a550709c))
* **post menu:** 'hide post' button wasn't appearing in thread page on desktop ([f7bab7c](https://github.com/bitsocialnet/5chan/commit/f7bab7c83e92b24220c8244f4e1f7d0754ebb1a7))
* **post menu:** 'view on (client)' link was broken on multisubs ([25722d7](https://github.com/bitsocialnet/5chan/commit/25722d74a3e048c03d69d924a644886fdb70310f))
* **post mobile:** tooltip for title wasn't centered ([ca0020f](https://github.com/bitsocialnet/5chan/commit/ca0020f2c5d360d1e77a4bfcc716bf162a1c9174))
* **post:** 'comment too long' link was broken for description and rules ([2ab7197](https://github.com/bitsocialnet/5chan/commit/2ab71978a7329fd0d58e0ce028332cd25b65c931))
* **post:** "c/" was clickable while post is pending ([74ddae0](https://github.com/bitsocialnet/5chan/commit/74ddae0ed7a9fc9b1724355d076dbdb13107c861))
* **post:** "c/Pending" could appear on first render ([2590a9c](https://github.com/bitsocialnet/5chan/commit/2590a9c096657ce53d016f3570189a2bc7085930))
* **post:** clicking the quotelink or backlink to a reply wouldn't scroll to the reply more than once in a row ([e1422d0](https://github.com/bitsocialnet/5chan/commit/e1422d005419f21ddf039c76021156679146dc91))
* **post:** content could overflow on mobile, causing horizontal scroll ([1122eb4](https://github.com/bitsocialnet/5chan/commit/1122eb4f714dcb709a2d24e0f3a8096ff4029906))
* **post:** deleted or removed comments still showed display name, avatar, role and ID ([b7e443d](https://github.com/bitsocialnet/5chan/commit/b7e443d7d3d1e7c9e79b5996e34ae856057253fc))
* **post:** don't show link if comment is removed or deleted ([068c30a](https://github.com/bitsocialnet/5chan/commit/068c30a3222877c816b22601920c0d03a18b7c18))
* **post:** edited timestamp showed html on mobile ([ba49060](https://github.com/bitsocialnet/5chan/commit/ba4906058db17c474308c501ea756ee504140f6d))
* **post:** reply backlink didn't appear in post info immediately after replying to it ([0f6b922](https://github.com/bitsocialnet/5chan/commit/0f6b9225165983986771a712787c30f5a5215c8d))
* **post:** some gifs would appear animated before expanded ([5a56016](https://github.com/bitsocialnet/5chan/commit/5a56016c85bf5f7ac78af8ce3783e71c1eb8181b))
* **replymodal:** replying didn't work from multiboard feeds (p/all, p/subscriptions) ([f6548cc](https://github.com/bitsocialnet/5chan/commit/f6548cc2b826ba4b80d9d7511df17891408e016a))
* **settings:** closing modal could close app ([b8fc7fb](https://github.com/bitsocialnet/5chan/commit/b8fc7fbe2c7b389a1315e099249db35de6e8ba7e))
* **theme:** changing theme in sfw sub wouldn't change it for p/all and p/subscriptions. it should because sfw is the default ([f06c50e](https://github.com/bitsocialnet/5chan/commit/f06c50ef33a3b5fc82c8532c144fd87e7be291d4))
* **theme:** theme changed incorrectly in pending post page ([4e390a9](https://github.com/bitsocialnet/5chan/commit/4e390a9fc573610ae76249b9126a42d85b442a87))
* **use-replies:** a reply to a newly-published reply wouldn't render until propagated ([a698b22](https://github.com/bitsocialnet/5chan/commit/a698b222f8a22bf3a4e5850cd5328b81cebbbdfa))


### Features

* **board stats:** remember hide/show choice per subplebbit ([d482d32](https://github.com/bitsocialnet/5chan/commit/d482d3246744b0d7701888fa0ce18433d7798381))
* **catalog:** add text pattern filters ([da33358](https://github.com/bitsocialnet/5chan/commit/da33358ca418db4cd3840b96996bed43d7825c57))
* **feed:** show account comments instantly in the feed once published, instead of waiting for the feed to update ([8598d10](https://github.com/bitsocialnet/5chan/commit/8598d1056ee9b08cb146b129356c28c14a8ec79a))
* **markdown:** when the user is publishing a comment, automatically format it to follow markdown rules ([c521ccb](https://github.com/bitsocialnet/5chan/commit/c521ccbc2ebf2d4d67889a28733d07eab4b8fa7b))
* **pending post:** show board navigation, stats and post form ([cdee29e](https://github.com/bitsocialnet/5chan/commit/cdee29e94ffa7cb616aacd34719114d384e60278))
* **post form:** add link media info for static or animated gifs ([4103fab](https://github.com/bitsocialnet/5chan/commit/4103fabb12c2b7f57c6c07808af4b7c213408852))
* **post:** add button to show full comment when it's too long ([99a2197](https://github.com/bitsocialnet/5chan/commit/99a219733c65138616976fd3f3f71a6b90199909))
* **post:** add user ID with color specific to user address ([8dfe209](https://github.com/bitsocialnet/5chan/commit/8dfe2098ce14e77898805093b5ce28c610f1b098))
* **post:** show embed of link in post content even if it doesn't have a thumbnail ([09a1441](https://github.com/bitsocialnet/5chan/commit/09a14416c8bcbd722ebeb3bbc0b158bf12c1190b))
* **settings:** add anon mode - automatically use a different user ID in each thread ([db67a94](https://github.com/bitsocialnet/5chan/commit/db67a9452c048c5abc954cbae345269495ab6c65))
* **settings:** add option to hide avatars ([5b7acbc](https://github.com/bitsocialnet/5chan/commit/5b7acbc5689d9cebee10d0ba8661227c9996b3cf))


### Reverts

* Revert "chore(package.json): v0.2.5" ([1d86267](https://github.com/bitsocialnet/5chan/commit/1d8626757b77093f5c57c7c92452d7bb1de3a916))



## [0.2.4](https://github.com/bitsocialnet/5chan/compare/v0.2.3...v0.2.4) (2024-07-23)


### Bug Fixes

* "this thread is closed" didn't appear instantly after mod edit ([84abe90](https://github.com/bitsocialnet/5chan/commit/84abe902c455f1e9516ac7f6cda944ec532c9921))
* **board title:** offline icon would appear in p/all and p/subscriptions ([38e60fd](https://github.com/bitsocialnet/5chan/commit/38e60fd797812756480c84d46fb81a4223efec9a))
* **catalog post:** it was not possible to scroll past the floating post preview ([9960e40](https://github.com/bitsocialnet/5chan/commit/9960e400e822214377842cf43789a20c5324caf8))
* **edit menu:** reason field would reset at menu close ([15462f1](https://github.com/bitsocialnet/5chan/commit/15462f14ede7b0b3920ae62305b2bc3b112476da))
* **electron:** download url redirect status code changed ([c63b950](https://github.com/bitsocialnet/5chan/commit/c63b9507dec80626d22dbeb7d5663ea647b0358f))
* **iframe:** background was white in tomorrow theme ([8d766cc](https://github.com/bitsocialnet/5chan/commit/8d766cc9e3b1bf668b02fcaa651678b4cb125b38))
* **markdown:** bullet point lists were bugged ([9552938](https://github.com/bitsocialnet/5chan/commit/9552938b6de5fd3d860cca8c9335ce6f1487adbb))
* **post menu:** block button was visible for description and rules ([4ffd750](https://github.com/bitsocialnet/5chan/commit/4ffd75010d53dbf068fd6e4040954a6902163d10))
* **post:** failed replies would link to op ([44e518a](https://github.com/bitsocialnet/5chan/commit/44e518a3ad449bb2e6857634d0fffe04b622d919))
* **post:** include pending replies in "x replies omitted" count ([01dacc8](https://github.com/bitsocialnet/5chan/commit/01dacc82705f0c9a6ef20fe53673de3c06c220e5))
* **post:** pending reply to op would show quote link to op ([ec4ba55](https://github.com/bitsocialnet/5chan/commit/ec4ba550aa0950afd9374e9a6c17b26553682dff))
* **post:** permalink (c/) of pending reply shouldn't link to anything ([3ddf26c](https://github.com/bitsocialnet/5chan/commit/3ddf26c93029cc60452d2aa3e13a752e3c4284fc))
* **post:** remove "user was banned for this post" because it's only visible to mods at the moment ([89e19ad](https://github.com/bitsocialnet/5chan/commit/89e19adb5c4d3717fe4a785047aca2f790be4643))
* **post:** reply quote link couldn't render in posts with link and no content ([ddb462b](https://github.com/bitsocialnet/5chan/commit/ddb462b95e7c00fc81f28234d12ce3909ede7dc8))
* **replies:** a reply would not appear immediately if published to a reply that was just published ([3950f7b](https://github.com/bitsocialnet/5chan/commit/3950f7b8647df971e4e1bb4147838ae60e3166ac))
* reply count was bugged ([6d6187e](https://github.com/bitsocialnet/5chan/commit/6d6187e531065f744dde8a16f14977112c418407))
* **reply modal:** cursor would move to end of text while replying ([6430607](https://github.com/bitsocialnet/5chan/commit/6430607363419b695487942ec31ea071f4205912))
* **spoiler:** spoiler image wasn't showing for iframes ([85aeb86](https://github.com/bitsocialnet/5chan/commit/85aeb860475a6efa223ec0e8b931671ca91a5edb))
* **subplebbit stats:** stats box appeared even if stats are undefined ([811405d](https://github.com/bitsocialnet/5chan/commit/811405dea9d72ef41a115d7a0e110c57b1040f89))
* **themes:** inherit selected theme in pending post page ([d66a0b8](https://github.com/bitsocialnet/5chan/commit/d66a0b8efe49f0401e04155e177f60d4493e289a))
* **topbar:** empty brackets would show for sub category if empty ([a31beee](https://github.com/bitsocialnet/5chan/commit/a31beee6318047e3bed5f02820468360e6b3db5c))


### Features

* **board header:** add yellow offline icon for loading online status, red icon for offline status ([fe434cb](https://github.com/bitsocialnet/5chan/commit/fe434cb6343a6a00da1467c4b9094cb507a1fbef))
* **post page:** add error line above post ([a234776](https://github.com/bitsocialnet/5chan/commit/a2347769e27145677388d01a462b2d93ab76be51))
* **post page:** add reply count and link count in top row ([8d05db8](https://github.com/bitsocialnet/5chan/commit/8d05db8843748c297c1dbb4573e1547b51eb7d4a))
* **post:** add 'loading comments' indicator ([a6a551a](https://github.com/bitsocialnet/5chan/commit/a6a551a25f4b0f14b3650ec13d016ec60146f636))
* **post:** add avatars ([1e16068](https://github.com/bitsocialnet/5chan/commit/1e16068c3a18693dbf7bbd91e9c11f409d9673f1))
* **post:** add loading state string ([954b158](https://github.com/bitsocialnet/5chan/commit/954b158704eced583cae4f689c74721d47e53081))
* **post:** add support for static GIFs ([7253e4d](https://github.com/bitsocialnet/5chan/commit/7253e4d1a0edb20eed576826e1ce80d8169d9abf))
* **post:** add tooltip to comment edit timestamp ([e716a45](https://github.com/bitsocialnet/5chan/commit/e716a45a3130bcfa8877a2b347012e6b63b4d261))
* **post:** show loading state info ([7ff8af7](https://github.com/bitsocialnet/5chan/commit/7ff8af7fcd78f044d352fc74b67f7d3a712e5a7d))
* **settings:** add avatar setting ([f2e4f14](https://github.com/bitsocialnet/5chan/commit/f2e4f14a33ac2d41e029f54ae05000f31468f8f8))
* use red offline icon for subplebbits that are most likely offline (ipns record fails to update) ([9f75449](https://github.com/bitsocialnet/5chan/commit/9f7544936e9418ce99f562d6ccdd1a043adf2602))


### Performance Improvements

* **offline indicator:** improve reliability ([bd7c5ae](https://github.com/bitsocialnet/5chan/commit/bd7c5ae57912e54b7cf996952a291d7de2467cc6))



## [0.2.3](https://github.com/bitsocialnet/5chan/compare/v0.2.2...v0.2.3) (2024-07-03)


### Bug Fixes

* **board:** description and rules weren't visible on feed view ([4f312f6](https://github.com/bitsocialnet/5chan/commit/4f312f67c0354737d2fa37ee19e531990e880410))
* **catalog filters:** filters changed their opposite value ([b3bfc7f](https://github.com/bitsocialnet/5chan/commit/b3bfc7fccc9f90dfd88d51a85629684c5caa58b0))
* **catalog post:** floating post preview was not visible on mobile ([38e1c78](https://github.com/bitsocialnet/5chan/commit/38e1c7865417943329956e960a33b4fd50315692))
* **edit menu:** banning wasn't working properly ([9ee2c6c](https://github.com/bitsocialnet/5chan/commit/9ee2c6c00e6ddff5da84f349cccbaf60208c3cd1))
* **post mobile:** backlinks position was bugged ([6647f25](https://github.com/bitsocialnet/5chan/commit/6647f25bf88b54a11dfe64af2a56b2819e6c4d5a))
* **post:** '0 replies omitted' appeared if all replies are removed or deleted ([76fc1dd](https://github.com/bitsocialnet/5chan/commit/76fc1dd2f19eb9046ffd9c93dc03e9e244f50104))
* **post:** author edit reason was missing ([0783374](https://github.com/bitsocialnet/5chan/commit/0783374a30315d012aa0fffe76403f3658fbf98e))
* **tooltip:** position could change from top to side ([7fce789](https://github.com/bitsocialnet/5chan/commit/7fce78909602b43c17fd60cab5c45d15a6179af4))
* **topbar:** time filter would redirect to board home on mobile ([a662bb6](https://github.com/bitsocialnet/5chan/commit/a662bb6718e094022d4c3fa8fe222064bda697ae))


### Features

* 'tomorrow' theme applies the browser's dark color scheme ([387851d](https://github.com/bitsocialnet/5chan/commit/387851d74352281c6f75f71f0c46ea552eaf4e57))
* add FAQ page ([66cc23c](https://github.com/bitsocialnet/5chan/commit/66cc23c404f158c839bc1382aab2f0db3181a78a))
* **board header:** add sub online status info to offline icon title ([5276f0a](https://github.com/bitsocialnet/5chan/commit/5276f0ad43a38afc90b0341c5e91c904efb8348b))
* **catalog:** add 'you have blocked this board' message and unblock button ([d3c29fd](https://github.com/bitsocialnet/5chan/commit/d3c29fd6ece80c0293d5d757158373edec0912e6))
* **catalog:** display error from subplebbit in feed (such as, 'address is incorrect') ([9495e98](https://github.com/bitsocialnet/5chan/commit/9495e98183e9852d6c3ca1b172150d247c4b18e9))
* **homepage:** offline icons give info about the board online status ([c81c7b8](https://github.com/bitsocialnet/5chan/commit/c81c7b85f099c837a1bcb9f5cbf51e018c0bbd16))
* **post:** add 'user was banned for this post' if user was banned by board to post in it ([f6c1fb4](https://github.com/bitsocialnet/5chan/commit/f6c1fb400b4950ec38c0414e993929ecc78e8bdf))
* **post:** add post count and highlight functionality to u/address ([a6a41ed](https://github.com/bitsocialnet/5chan/commit/a6a41edd760a9b5f41302bd8008695f290a5c9e7))
* **post:** add tooltips for title and display names that are too long ([505aed4](https://github.com/bitsocialnet/5chan/commit/505aed4c2467bc90e44a6f300c45af8af1f51525))
* **post:** clicking "+" button next to "omitted replies" message shows all replies ([713739b](https://github.com/bitsocialnet/5chan/commit/713739b02f1572164f1923b48b4e4d19b0c48ebe))
* **post:** clicking "+" button next to "omitted replies" message shows all replies ([d78ce84](https://github.com/bitsocialnet/5chan/commit/d78ce84db407cbb364e447fec7ec74e4741e08d7))
* **post:** show edit reason as tooltip over red text ([1bccf87](https://github.com/bitsocialnet/5chan/commit/1bccf87750ceb32c8bcc016d6a92e2cba1fee438))
* **reply modal:** greentext by selecting text ([972964d](https://github.com/bitsocialnet/5chan/commit/972964dedafea109f2674a0fffff58e461b59912))
* **styles:** remember style selection per sfw or nsfw category, instead of single board ([06e1828](https://github.com/bitsocialnet/5chan/commit/06e18289a4d8b46f9b6e41d98d87aa16b02ceb68))



## [0.2.2](https://github.com/bitsocialnet/5chan/compare/v0.2.1...v0.2.2) (2024-06-22)


### Bug Fixes

* **catalog filters:** clarify label ([677fe64](https://github.com/bitsocialnet/5chan/commit/677fe641a3ad6aa33449ed4bf92bb31ede27dc4a))
* **catalog:** large image size was incorrect ([b5b5c5c](https://github.com/bitsocialnet/5chan/commit/b5b5c5ca467e2b1c1695a37d43b0a9ad9adcd9ce))
* **not found page:** only show 'back to p/...' button if subplebbitAddress is in valid format; limit img size ([1900d1c](https://github.com/bitsocialnet/5chan/commit/1900d1cdf2a9869ad3af8e9a7a2a563f9850c868))
* **post:** don't show c/quote in content if reply is removed or deleted ([533fc2f](https://github.com/bitsocialnet/5chan/commit/533fc2ffa3123519d4f0cee8c7766610a9434c44))
* **post:** mod and author edits weren't instant ([cb745ff](https://github.com/bitsocialnet/5chan/commit/cb745ffce62e63f6721f4024f1b843c549def548))
* **reply:** edit menu checkbox was displaced on mobile ([9052b0f](https://github.com/bitsocialnet/5chan/commit/9052b0f4f626fa70181b28986b8a3a76ae44f348))
* **themes:** changing theme would bug out ([032ba62](https://github.com/bitsocialnet/5chan/commit/032ba62cbefc41df328d8a3f1a767e6115736da5))



## [0.2.1](https://github.com/bitsocialnet/5chan/compare/v0.2.0...v0.2.1) (2024-06-20)


### Bug Fixes

* incorrect assets path ([4cca4a5](https://github.com/bitsocialnet/5chan/commit/4cca4a58dd0a8e4913cb10e7ab7bd19b46b57146))



# [0.2.0](https://github.com/bitsocialnet/5chan/compare/v0.1.17...v0.2.0) (2024-06-20)


### Bug Fixes

* **app:** prevent scrollbar glitch on board layout routes, also hiding unnecessary scrollbar in home ([61f2344](https://github.com/bitsocialnet/5chan/commit/61f23443ca6c2d48b9fdddce7e78ef948bb5ca6a))
* audio elements were displaced in catalog ([9090c18](https://github.com/bitsocialnet/5chan/commit/9090c186528ce79cb3da1d14ec48bb6a054997ba))
* **board banner:** subplebbit short address was wrong ([c491b07](https://github.com/bitsocialnet/5chan/commit/c491b0729588cc6f58094bea269c945fc0429de6))
* **board buttons:** don't show subscribe button in multiboards ([22657ff](https://github.com/bitsocialnet/5chan/commit/22657ff90a709349597cf6fbc01ef58ba0da76db))
* **board buttons:** link for return button was broken ([7086d6b](https://github.com/bitsocialnet/5chan/commit/7086d6b77711b3f45f707fead2f89d2d6ae17c4f))
* **board buttons:** return button was broken, subscribe button shouldn't render in p/all and p/subscriptions ([6f003f9](https://github.com/bitsocialnet/5chan/commit/6f003f9c11bac3579b8cdab0e1d6fbfa7924550e))
* **board stats:** table warning, margin ([b6f38b5](https://github.com/bitsocialnet/5chan/commit/b6f38b532a5ed51e74c6b3a623b208a1f2efa0cc))
* **board:** don't show description and rules until feed loads ([0f07e1e](https://github.com/bitsocialnet/5chan/commit/0f07e1eedeb3ea9f23657739a410755ea71a07c0))
* **catalog filter:** force show op comment for text-only threads ([da86c2f](https://github.com/bitsocialnet/5chan/commit/da86c2f17f37068cc0cf026a486dd2266c6237c2))
* **catalog post:** display title inline ([9ebf3b7](https://github.com/bitsocialnet/5chan/commit/9ebf3b79b69cdd0a0947bc5fc26a182cdefab7f5))
* **catalog post:** don't render markdown embeds and hr ([05f7977](https://github.com/bitsocialnet/5chan/commit/05f79774671a5d681182572fdb95ab1a95323464))
* **catalog:** don't show description or rules if they are defined but empty ([e191e40](https://github.com/bitsocialnet/5chan/commit/e191e403dbfd0e81dd6e80252255e3226b30b2ce))
* **challenge modal:** disable draggable on mobile ([9c2036a](https://github.com/bitsocialnet/5chan/commit/9c2036a6a17534b00198a2c2eda1e46b5a6ed580))
* **challenge modal:** react-draggable requires nodeRef in React StrictMode ([ef1580e](https://github.com/bitsocialnet/5chan/commit/ef1580e8c0c269363f52fc23013359637bf134f7))
* **comment media:** only show link if valid, show webpage links on mobile ([b778b88](https://github.com/bitsocialnet/5chan/commit/b778b887081772d4e468146d08e814b4f287388a))
* **comment media:** rename, refactor, fix performance ([e8c60fc](https://github.com/bitsocialnet/5chan/commit/e8c60fc5bec7ce7ee2afa809b1192a979e129027))
* **crypto wallets:** update translation ([40a95fd](https://github.com/bitsocialnet/5chan/commit/40a95fd6d83640967d2569addce4ed34fafb0517))
* **description:** escape character wasn't excluded from translation ([7648ef1](https://github.com/bitsocialnet/5chan/commit/7648ef1432e0bb2ce4c9aa18e68f6987314f9779))
* don't consider 'anti' tag as nsfw tag ([62b4c71](https://github.com/bitsocialnet/5chan/commit/62b4c71eb5b2077f82b86d1496accd1211ec8e45))
* don't show 'sub might be offline' alert in multisubs ([937abf8](https://github.com/bitsocialnet/5chan/commit/937abf8dcac03c1f6c5134449c5552f043a779cb))
* don't show subplebbit stats in multiboard feeds ([c83169e](https://github.com/bitsocialnet/5chan/commit/c83169ea1276c58d26dff33c32f24642c61b1464))
* **edit menu:** fix input value warning ([f20a5f2](https://github.com/bitsocialnet/5chan/commit/f20a5f21f9d76ea8735dd22385b112a36b359a92))
* **edit menu:** mod and author edits were conflicting ([efc9a98](https://github.com/bitsocialnet/5chan/commit/efc9a98f47777c45f7ea54b2b2821aa6c6709714))
* **embed:** detect uppercase extension in link ([86738de](https://github.com/bitsocialnet/5chan/commit/86738de226a57ae0b85601fbf0eef4dc591a82df))
* **embeds:** pass origin to youtube or popular videos won't load ([e91bb58](https://github.com/bitsocialnet/5chan/commit/e91bb587a1cbfa20fcaa6dd9e180157b35cbf806))
* **feed:** show last 5 replies of thread in feed, not first 5 replies ([608aa63](https://github.com/bitsocialnet/5chan/commit/608aa632d4c6ac19b4065b18e2215b07ff5e9984))
* hiding/blocking comments wouldn't work because useBlock takes cid, not address ([743bd9b](https://github.com/bitsocialnet/5chan/commit/743bd9b4c8312da4897297d297b95eb1a7bec6e7))
* **home:** allow button and search bar to resize for other languages ([b13734a](https://github.com/bitsocialnet/5chan/commit/b13734aedf8a285e05a0dfe419c7dcd0b6fee301))
* **home:** update twitter link ([019972a](https://github.com/bitsocialnet/5chan/commit/019972a7ffb86de82ee74a131b1b304d83da9ca7))
* incorrect pathname check would scroll to reply unexpectedly ([81972c9](https://github.com/bitsocialnet/5chan/commit/81972c9c8551ee6e6bf4f8fe50c3957fd2cd83bf))
* **index.html:** add no-referrer meta tag to resolve CORP-related media access issues ([f25978f](https://github.com/bitsocialnet/5chan/commit/f25978f180a39054ec118b662a74f6c9b758fd3b))
* **index.html:** disable auto zoom on some mobile browsers ([c042611](https://github.com/bitsocialnet/5chan/commit/c0426116e2e9ffb594c9f4b4144ebd59ba347cdb))
* link type in post form should be next to link field ([a048887](https://github.com/bitsocialnet/5chan/commit/a048887a58bfcd312b5ad3bb052dbd0f4d17db64))
* **markdown:** remove spoiler text, there's no syntax for it yet ([3108107](https://github.com/bitsocialnet/5chan/commit/31081079bca4d490c094ea1999c0842252c170e1))
* **markdown:** show single break ([967f781](https://github.com/bitsocialnet/5chan/commit/967f781cfd43841582b26eaff00205dfa1adc302))
* **multisubs:** don't show subscribe button ([07af318](https://github.com/bitsocialnet/5chan/commit/07af3187c69bc0357a58d4bfef15525eef87a609))
* **not found:** check if subplebbitAddress is valid before displaying 'back to' buttton ([f7ce689](https://github.com/bitsocialnet/5chan/commit/f7ce6890ec183cc6d287f34dc2d7fc8c5d914ed1))
* **not found:** force yotsuba theme with ref, not with params in app because they can't be detected in app ([5e8d743](https://github.com/bitsocialnet/5chan/commit/5e8d7436f9b09b39d1a5b5e8e1e2d03292a2d6c8))
* only show catalog post preview on mouse over thumbnail ([a8e3ce8](https://github.com/bitsocialnet/5chan/commit/a8e3ce8429f4d119e74649577a18ce9b7639b12d))
* **pending post:** settings were not shown correctly ([ddd063f](https://github.com/bitsocialnet/5chan/commit/ddd063fdef245d6a76637ce7de83f56f753aca81))
* performance, logic ([3eb9c5c](https://github.com/bitsocialnet/5chan/commit/3eb9c5c20f604f8081b913e2577d84992fbfbd60))
* **popular threads box:** default to worksafe content and show 8 posts for single subplebbit ([c6a1283](https://github.com/bitsocialnet/5chan/commit/c6a1283b56b0953d9513d7aa32d0d8c59a5cdfee))
* position floating catalog post preview relative to thumbnail dimensions ([2a5ecf9](https://github.com/bitsocialnet/5chan/commit/2a5ecf90ee7372cc8aeb7d59ee14b29b3e8bb749))
* **post form:** close after publish, reset fields ([359031c](https://github.com/bitsocialnet/5chan/commit/359031c1df344a2eea81c571b1fceb60bca453e1))
* **post menu mobile:** close after hiding reply ([bbc3f30](https://github.com/bitsocialnet/5chan/commit/bbc3f30e18903b1fbfe076e2ed50b18976a68713))
* **post menu:** use floating ui to dynamically position dropdowns based on available space ([d964590](https://github.com/bitsocialnet/5chan/commit/d964590f544029ae126a5e0dd4fec9f44ee86845))
* **post mobile:** clearfix for floating media ([84dae0a](https://github.com/bitsocialnet/5chan/commit/84dae0a19bfc46205091b2b0677308b0ac6c0caa))
* **post:** break words on mobile to prevent overflow ([8e6aca6](https://github.com/bitsocialnet/5chan/commit/8e6aca6e324889bc7ef05e02de9c27c235d5b441))
* **post:** don't show replies in pending post page ([b785d00](https://github.com/bitsocialnet/5chan/commit/b785d00ec429214d6ca805941367b8e5b1c3c25d))
* **post:** limit displayName length ([607aad9](https://github.com/bitsocialnet/5chan/commit/607aad93796b567824ed38c8f1da7187f4e58393))
* **post:** post menu position was wrong on some browsers ([cc06d54](https://github.com/bitsocialnet/5chan/commit/cc06d54c81e89bf2b2a565e9dfd5bff67a08eb00))
* **post:** prioritize 'failed' state over 'pending' ([fc459d9](https://github.com/bitsocialnet/5chan/commit/fc459d9533505cd911760fb36e92a70e42d45c1d))
* **post:** remove margin to fix virtuoso glitch on desktop ([af75215](https://github.com/bitsocialnet/5chan/commit/af752159383b94d7c228e6e16f2518744b5ee6a8))
* **reply modal:** add minimal timeout to allow rerender when already opened ([05cc3c4](https://github.com/bitsocialnet/5chan/commit/05cc3c41740a96c64bd7b30e9c09a98c76cff3b5))
* **reply modal:** autofocus caused auto scroll to top on mobile ([952d446](https://github.com/bitsocialnet/5chan/commit/952d446c4d41a742139c543fdfc21fb32f4f26a9))
* **reply modal:** do nothing when clicking another cid while modal is opened ([4fa6f60](https://github.com/bitsocialnet/5chan/commit/4fa6f6079216b6e74c9fd1cf0616ea243bb91c75))
* **reply modal:** get mobile scroll position from hook before render ([1e91119](https://github.com/bitsocialnet/5chan/commit/1e9111968730f05adac0267cf4efdbd146042485))
* **reply modal:** improve c/parentCid styling in textarea ([148e6f1](https://github.com/bitsocialnet/5chan/commit/148e6f1989586db81222d80cb2cbf1d04e8932fd))
* **settings:** decode subplebbit address with emoji to fix pathname ([2ecedcc](https://github.com/bitsocialnet/5chan/commit/2ecedcc956b456b84966b8e1a148a878af8a083b))
* spoiler text wasn't rendering on mobile ([656c31c](https://github.com/bitsocialnet/5chan/commit/656c31c0132559cd23da09c3641cfaf1451b3c88))
* **subplebbit description:** prevent escaping characters in translation ([aac20c4](https://github.com/bitsocialnet/5chan/commit/aac20c4671bbd07cd6756217ff270510bbf2464c))
* **subscriptions:** show info if no subs found ([b07a06f](https://github.com/bitsocialnet/5chan/commit/b07a06fa129fd926201f3e6cb2310c40d38c3226))
* time filter appeared twice on mobile ([ae1b860](https://github.com/bitsocialnet/5chan/commit/ae1b860f3b4a9248399ec9bbf4d34cd5329af788))
* **topbar:** settings link would 404 ([1aff0d3](https://github.com/bitsocialnet/5chan/commit/1aff0d3adaec753e23a00276382b34641a88979b))
* **use-replies.ts:** flatten and display replies of replies not yet published ([6e20b86](https://github.com/bitsocialnet/5chan/commit/6e20b86b7bb0bdabd524154bce01152662ee9c9a))
* **use-replies.ts:** flatten comment pages ([087d4ab](https://github.com/bitsocialnet/5chan/commit/087d4ab738967d460e392daee291c220759bc473))
* **use-replies:** sort by timestamp and move pinned replies to the top ([8b000a0](https://github.com/bitsocialnet/5chan/commit/8b000a0bdb225040319829b8ae92d77aa1501b83))
* **use-subplebbits-stats:** hook would fetch the same stats if pending fetching ([79b660e](https://github.com/bitsocialnet/5chan/commit/79b660eaa02e3dac9923064b36013965be560844))
* **use-theme:** body css would bug out on navigation ([73f4136](https://github.com/bitsocialnet/5chan/commit/73f4136f535bc221c8f29abd2d29e991c09d6287))
* video thumbnails stuck on loading, post page overflow ([0036508](https://github.com/bitsocialnet/5chan/commit/00365086623dd05ea5a81be04790a68fba45bb25))
* wrong document titles ([19164db](https://github.com/bitsocialnet/5chan/commit/19164db606a71ea9dc2e293586d7b6c9ea52c444))
* wrong mobile value ([3a6d2f1](https://github.com/bitsocialnet/5chan/commit/3a6d2f16b0023607680c70929eb12dfaf888bb90))
* wrong route check, default time filter value, missing translation ([0831e75](https://github.com/bitsocialnet/5chan/commit/0831e757bb13aecf0ff3039b077fcf5f7b2fbae1))


### Features

* **account settings:** improve UI ([c31c0a4](https://github.com/bitsocialnet/5chan/commit/c31c0a4482943be76d2c372fcb919a64153da521))
* add '(You)' in quote links ([5f792f4](https://github.com/bitsocialnet/5chan/commit/5f792f40f059dc6dbfa1c572c4a3c6d56f9a2429))
* add 'not found' view ([5d124d2](https://github.com/bitsocialnet/5chan/commit/5d124d21211bec05cf0380bb58334871d6720fe9))
* add "hidden threads" counter and button in catalog and board view, store and hook ([fd092f1](https://github.com/bitsocialnet/5chan/commit/fd092f1bee9899a25167e156f7f82c40bfa9ba7e))
* add backlink highlight and scroll ([1911b62](https://github.com/bitsocialnet/5chan/commit/1911b623d9cbe56e9684ef4cef002f495ac1dd57))
* add board-banner ([b99e9f1](https://github.com/bitsocialnet/5chan/commit/b99e9f143b40c71d04147aec5634235a5704384a))
* add challenge modal ([cc5d042](https://github.com/bitsocialnet/5chan/commit/cc5d04288981ecbe2fec851d4669fcf874ddc216))
* add edit menu on mobile ([1d84526](https://github.com/bitsocialnet/5chan/commit/1d8452684b45f6ac4391591d49af6301ce385d9c))
* add floating quote preview to mobile replies ([84c0490](https://github.com/bitsocialnet/5chan/commit/84c04904f3ae370810a6ee66dd28ff6c1da6b928))
* add mod menu ([daaba0f](https://github.com/bitsocialnet/5chan/commit/daaba0f006b9b8f639775c1e6ff32f25485adb95))
* add new banner image ([a269e10](https://github.com/bitsocialnet/5chan/commit/a269e102e4c01aad8e4fbde27042dfde944d6ff7))
* add offline icon to board title, show alert before posting if sub appears offline ([a2c1ec4](https://github.com/bitsocialnet/5chan/commit/a2c1ec441f005562792185195b3a2d53bdfd6c54))
* add post-menu-mobile ([475d9ae](https://github.com/bitsocialnet/5chan/commit/475d9ae4166e887748e0211776dff7cb23e4db8a))
* add reply modal ([0962c10](https://github.com/bitsocialnet/5chan/commit/0962c10685e914162796526419ab315fa439bd5e))
* add spoiler image ([9f5f92f](https://github.com/bitsocialnet/5chan/commit/9f5f92f714a1305ce71fab78be5d962c3918d0d4))
* add spoiler text ([70a2045](https://github.com/bitsocialnet/5chan/commit/70a20450bbf37943038cc310d894c32fac8798af))
* add time filter to p/all and p/subscriptions ([15bffe8](https://github.com/bitsocialnet/5chan/commit/15bffe89bf7a82ef7d9d7b4c125136bd7bdeb87e))
* **android:** update icon ([0391b24](https://github.com/bitsocialnet/5chan/commit/0391b249df9b7b6ea882b13eff7ffecd369319de))
* **app:** add description and rules views ([a508059](https://github.com/bitsocialnet/5chan/commit/a508059af1dca5ab1c1d9c53c6c10522f44335e3))
* **app:** add pending post view ([394c7d8](https://github.com/bitsocialnet/5chan/commit/394c7d8a810fe8c2b95db4c656cd3f574d00b691))
* **app:** add post page ([dcd29a4](https://github.com/bitsocialnet/5chan/commit/dcd29a46bb4032a3de934f3409a643a5dd5b3e5c))
* **board buttons:** improve layout, increase dimensions of post form on mobile, add refresh buttons ([bc74a9f](https://github.com/bitsocialnet/5chan/commit/bc74a9ff77aa3dda194ac966a6d3cac505c100c1))
* **board nav:** add home and settings buttons ([9096eca](https://github.com/bitsocialnet/5chan/commit/9096eca4fbb8994a92fa5af087f9f63599af7f5f))
* **board nav:** add sticky header animation to mobile ([bb9d53f](https://github.com/bitsocialnet/5chan/commit/bb9d53f47c847159c2b25b2c5bbd2f64ca0c6cac))
* **board nav:** if in catalog view, navigate to select sub's catalog view ([32e95dd](https://github.com/bitsocialnet/5chan/commit/32e95dda525bb9d2b11b3ca43455027e3858660c))
* **board nav:** order board list by multisub category ([474dede](https://github.com/bitsocialnet/5chan/commit/474dede5db55c5e9ce2dec41518f1c544af5db57))
* **board nav:** update mobile navbar animation on scroll ([6a386fa](https://github.com/bitsocialnet/5chan/commit/6a386fa1747af83aedae72d85d0dd7a22bec7bcb))
* **board nav:** use titles from multisub ([6aa5f38](https://github.com/bitsocialnet/5chan/commit/6aa5f3806379eae435ab275e2446d937666048ff))
* **board:** add p/all and p/subscriptions ([86223bb](https://github.com/bitsocialnet/5chan/commit/86223bb249685d9147dd9b99229d62de95910ba8))
* **board:** add post form UI on desktop with link type previewer ([a5a7a97](https://github.com/bitsocialnet/5chan/commit/a5a7a97e4712c6f27fe028d604fd508b23728593))
* **board:** show error in feed near loading string ([4b2a602](https://github.com/bitsocialnet/5chan/commit/4b2a6025d39d70987dea62346ee40b8e7003f706))
* **catalog post:** add hidden style ([8959945](https://github.com/bitsocialnet/5chan/commit/89599457228a8835575ff9a18f1a755c2910396d))
* **catalog post:** add loading skeleton for image, "file deleted" fallback img ([2aa5dc0](https://github.com/bitsocialnet/5chan/commit/2aa5dc01eb0955af5829e426a1c4a9481f4b442e))
* **catalog post:** add spoiler styling and text, add markdown to content ([914a7de](https://github.com/bitsocialnet/5chan/commit/914a7dee185826fa1e77e1457af764ba186e7854))
* **catalog post:** allow selecting text in posts with media thumbnails ([a7c7464](https://github.com/bitsocialnet/5chan/commit/a7c74640779dbd729560b58644192cc31e5fb373))
* **catalog post:** close menu button with second click ([38e958b](https://github.com/bitsocialnet/5chan/commit/38e958bed8ba6b2c3943b7f5b0ecf2f29345e2fa))
* **catalog row:** add post menu button ([a6ae543](https://github.com/bitsocialnet/5chan/commit/a6ae543b4a589d8664f596a09a0e4c2c5a0d5fdc))
* **catalog:** add 'image size' and 'show OP comment' options ([7f3630e](https://github.com/bitsocialnet/5chan/commit/7f3630e28907c9dbd75d593f6b02910d6d128175))
* **catalog:** add catalog post previews ([88dcfca](https://github.com/bitsocialnet/5chan/commit/88dcfcaca8cdfb38d3bc3f25863451abefb0d1d2))
* **catalog:** add filter to hide text-only threads, turned on by default ([ce93915](https://github.com/bitsocialnet/5chan/commit/ce93915919041e00de43426a1fd08ef75b45834a))
* **catalog:** add filters modal for text-only posts, nsfw boards in p/all ([aa63ab0](https://github.com/bitsocialnet/5chan/commit/aa63ab0f1b69e0e4a6f7a2d685dd1ade9f53586d))
* **catalog:** add filters to mobile ([e860593](https://github.com/bitsocialnet/5chan/commit/e860593650715838b48ddc1170adab0808e70733))
* **catalog:** add media, styling ([65c99ab](https://github.com/bitsocialnet/5chan/commit/65c99ab1887a99d3bdaf04a7641c7883699a574a))
* **catalog:** add post menu ([572eb3b](https://github.com/bitsocialnet/5chan/commit/572eb3b4e203b870469543af37261d434bf7cf82))
* **catalog:** add refresh button ([9c9249d](https://github.com/bitsocialnet/5chan/commit/9c9249da94c9d6ca4b253aa7a49961f5509d5f62))
* **catalog:** add sorting option ([1ecb2ba](https://github.com/bitsocialnet/5chan/commit/1ecb2ba13dcf5b379b578a88c5efb5294de9b336))
* **catalog:** add sticky and closed icons ([2fc12bb](https://github.com/bitsocialnet/5chan/commit/2fc12bbafeba0d3802c0421ddac5912683c92b95))
* **catalog:** apply filter for text-only threads to rules and description ([d9234c4](https://github.com/bitsocialnet/5chan/commit/d9234c4e2a926c13fba62c78527896994b79c535))
* **crypto wallets setting:** improve UI ([65b3b99](https://github.com/bitsocialnet/5chan/commit/65b3b997fb7d44e11852fe12d36be3b9b625fa29))
* **edit menu:** add comment edit and delete for authors ([2fabd3c](https://github.com/bitsocialnet/5chan/commit/2fabd3cf549f53da890bb30557fcaa734d8de92a))
* **embed:** add support for soundcloud embeds, show webpage links on mobile, adjust audio embeds ([7dba08c](https://github.com/bitsocialnet/5chan/commit/7dba08ca00befd82d6a103f1cc36e03e55b3e495))
* **feed:** add description and rules ([dcf0dd9](https://github.com/bitsocialnet/5chan/commit/dcf0dd98e4b4857a0bba33a23c2b33ef4fec3e60))
* hide button for posts soft hides them persistently without blocking the cid ([67e3bc8](https://github.com/bitsocialnet/5chan/commit/67e3bc8d685711e042cb76f28e49e0ed7b88c07f))
* hide media if spoiler ([052476a](https://github.com/bitsocialnet/5chan/commit/052476ad1ad839cb56c17bfe271b6fbe82f5df1e))
* highlight reply if visible, render it as floating preview if not visible ([fc21d87](https://github.com/bitsocialnet/5chan/commit/fc21d876ff253a0dd14a5ba37683bfa854bc4230))
* **home:** add custom hook for stats functionality ([798dfc4](https://github.com/bitsocialnet/5chan/commit/798dfc424ff48823a19b4e978b1a7f67070d09af))
* **home:** add filter options to boards box ([8d4c440](https://github.com/bitsocialnet/5chan/commit/8d4c4404c3a66bf6d4f950b7e1f0c61009915e5d))
* **home:** add multisub boards with categories, subscriptions list, moderating boards list ([de81073](https://github.com/bitsocialnet/5chan/commit/de8107372f92082f891ce8e41fe7654ca491e4bb))
* **home:** add offline icon for subs in board list ([6b71d90](https://github.com/bitsocialnet/5chan/commit/6b71d9009af580b19cc813af6259d33ca6fc32fe))
* **home:** add options to popular threads box ([fabcc1d](https://github.com/bitsocialnet/5chan/commit/fabcc1d2e1448223bcb29434e613c8bf5707e349))
* **home:** add popular threads box ([02b287f](https://github.com/bitsocialnet/5chan/commit/02b287fc12a17ab4228c2fd140b630bee8f0941d))
* **home:** add version in footer ([4614e5d](https://github.com/bitsocialnet/5chan/commit/4614e5dbc49e794c3dba55816f38969f47da341b))
* **home:** in popular threads box, show more posts per sub depending on available subs ([98c52e6](https://github.com/bitsocialnet/5chan/commit/98c52e65daf8feba38a4c82b1f14fac62c5fc02f))
* **home:** mark board as nsfw if it has at least one of nsfw tags in multisub ([c33c546](https://github.com/bitsocialnet/5chan/commit/c33c54613dcf0f055fcd95fc33069d526922535a))
* **home:** user can connect to a sub with search bar ([568189b](https://github.com/bitsocialnet/5chan/commit/568189bfea9848fcaf5555157bf7309055f7e249))
* **home:** user can download desktop client from footer button ([e59a229](https://github.com/bitsocialnet/5chan/commit/e59a2290ab8c37db054e1a687d4019bc8789aa6c))
* **loading ellipsis:** improve animation ([eddc098](https://github.com/bitsocialnet/5chan/commit/eddc0982bb5c8cf1f086af4ca96b011de9146c3b))
* **media:** add support for audio links ([0a52944](https://github.com/bitsocialnet/5chan/commit/0a52944a07d0dff523f4e35704e4bd235e284e73))
* **multisubs:** add catalog view ([cc2a640](https://github.com/bitsocialnet/5chan/commit/cc2a640ae247845b2ee3bf9a4d94da513dd08b91))
* **multisubs:** add settings modal ([970c726](https://github.com/bitsocialnet/5chan/commit/970c726720f065c2c5790f42dde5c79b5817751b))
* **multisubs:** add subplebbit address in post info ([82fe238](https://github.com/bitsocialnet/5chan/commit/82fe23897992f31eb28848bb2831c01d02a33912))
* **p/all:** add description view ([09f05ac](https://github.com/bitsocialnet/5chan/commit/09f05ac8a0eb5b655e31f21e45c83e6e7ef8b57d))
* **p/all:** use multisub title, description and createdAt in mock description and board header ([11d1424](https://github.com/bitsocialnet/5chan/commit/11d1424c0a890b43a5fecb048d894d3c81b7340f))
* **post desktop:** add hide/unhide replies ([8b60172](https://github.com/bitsocialnet/5chan/commit/8b601726aeaffdabc6a55d129794e24aec96411e))
* **post form:** add on mobile ([3573b65](https://github.com/bitsocialnet/5chan/commit/3573b65ffa8f2f96df1c1a6c6e72e6194a939bed))
* **post form:** add reply publishing in post page ([cf7d59c](https://github.com/bitsocialnet/5chan/commit/cf7d59c9b86a2e33370b2a56d6821a1b0a0a4799))
* **post form:** add row for link type, add spoiler option ([6223cb0](https://github.com/bitsocialnet/5chan/commit/6223cb0b24fc2b74c42695e458ad768e8aaf7bcc))
* **post form:** enable posting from p/all or p/subscriptions ([797d665](https://github.com/bitsocialnet/5chan/commit/797d66515021a181ba7b8bc9ca92aab0bda6c4cd))
* **post form:** replace single return with double return on submit, because markdown is mandatory on plebbit, but a user from 4chan won't know that ([ccb75fc](https://github.com/bitsocialnet/5chan/commit/ccb75fcf3a6057a0a09e1fcd0456654a1af1bc00))
* **post menu:** add copy link button (share link) ([caacd77](https://github.com/bitsocialnet/5chan/commit/caacd77bbabc26aada1845c68791144797105e86))
* **post menu:** add reverse image search ([677407c](https://github.com/bitsocialnet/5chan/commit/677407cd52f5f25be24b56c20d500dda9692df81))
* **post mobile:** add hide and unhide posts and replies ([0c02a6b](https://github.com/bitsocialnet/5chan/commit/0c02a6b9b68e5f525a784b68cc294a8c6ac91948))
* **post page:** add view specific buttons ([f5fefd5](https://github.com/bitsocialnet/5chan/commit/f5fefd51cf537b41ae7bf14b085505824185f7ef))
* **post page:** scroll to top, show full content, no hide thread ([e960f79](https://github.com/bitsocialnet/5chan/commit/e960f791b98063da7f2b3bde40df41f5e8b80712))
* **post:** add 'this thread is closed" alert for locked, removed, deleted comments ([84f5555](https://github.com/bitsocialnet/5chan/commit/84f55557c1cd5c5b477990e8e1ba62801cbebc8f))
* **post:** add "file deleted" img on error ([1882446](https://github.com/bitsocialnet/5chan/commit/18824468d403d68e313d2223bd6083067d0c0ba4))
* **post:** add "show original" button to content edit ([e4febb9](https://github.com/bitsocialnet/5chan/commit/e4febb9df087cacbc495de235687e68d078d8194))
* **post:** add "time ago" tooltip to dates ([19222a6](https://github.com/bitsocialnet/5chan/commit/19222a66fe6a98160bf0c28be265a3411e15d160))
* **post:** add block options to mobile menu ([3206631](https://github.com/bitsocialnet/5chan/commit/3206631e897218b84e41fd6c33028c2760668e3a))
* **post:** add content, links, buttons, optimize for feed scroll ([67f9334](https://github.com/bitsocialnet/5chan/commit/67f93349dd137d27c0e361855a7117aba52b3e2a))
* **post:** add deleted and removed styling, mod reason, file deleted ([05a8e91](https://github.com/bitsocialnet/5chan/commit/05a8e913313b40c40f64ca737b57abf2f12af384))
* **post:** add embed button and media to links in post content detected as valid embed links ([6bfa899](https://github.com/bitsocialnet/5chan/commit/6bfa899722f7f2e627d823a11edcbb0a8b288d28))
* **post:** add floating preview of media from link in post content ([39a48c9](https://github.com/bitsocialnet/5chan/commit/39a48c95159b259b95e11c4ed3144633bcf29cb4))
* **post:** add links and media info, including embed ([d0a3e95](https://github.com/bitsocialnet/5chan/commit/d0a3e959fcc1f76a067b6f726a39ddf8796e5dc7))
* **post:** add mod role to display name ([ebf1e42](https://github.com/bitsocialnet/5chan/commit/ebf1e426f596dc6a4004c73982a8fe444fab6d91))
* **post:** add post info row, update themes ([992ed5d](https://github.com/bitsocialnet/5chan/commit/992ed5dbb02f15af6d2841c25333c0e3494b709d))
* **post:** add post menu component with links to other clients ([08cb073](https://github.com/bitsocialnet/5chan/commit/08cb0736daee6dabbc9f5e3ec0e6165ed008c04b))
* **post:** block posts via the minus button (to collapse) or via the post menu ([32f5220](https://github.com/bitsocialnet/5chan/commit/32f52200b74d7160a6fbd94e080cd4483c0ddb52))
* **post:** choose date/time format from translations locale ([d9ac34e](https://github.com/bitsocialnet/5chan/commit/d9ac34ef0f2400b3d1aa7088aa38d17dfc926b6c))
* **post:** don't show link if it's not a valid url ([3524803](https://github.com/bitsocialnet/5chan/commit/3524803196e49dc12e578c5d8c0b059f8fbba634))
* **replies:** add backlinks ([cbc99f4](https://github.com/bitsocialnet/5chan/commit/cbc99f42b04e0170d2f441624cdf3fe13d84965a))
* **replies:** sort by timestamp ([35572de](https://github.com/bitsocialnet/5chan/commit/35572ded55bc0736b4559afde480300b1ad426cb))
* **reply modal:** add c/parentCid above textarea, fix tomorrow theme ([5f3ff17](https://github.com/bitsocialnet/5chan/commit/5f3ff17eccf3bf875493d1b1a0f4d4723f046f32))
* **reply modal:** add link type previewer, spoiler option ([c5d55a9](https://github.com/bitsocialnet/5chan/commit/c5d55a9dd5e6b0d9072f34e9abe636ad1a121c50))
* **reply modal:** change displayName from name field, style focused inputs, translate title ([1e5c675](https://github.com/bitsocialnet/5chan/commit/1e5c675e95f9c7a9eb5f96204a4e4788cc32ab3b))
* **reply modal:** disable draggable on mobile and calculate absolute top position ([d6179d0](https://github.com/bitsocialnet/5chan/commit/d6179d0fdca562a376cf0fd8bb18f1fa9cc7144c))
* **reply modal:** show alert before posting if subplebbit might be offline ([d71889a](https://github.com/bitsocialnet/5chan/commit/d71889a3de40de6a0347c82cc7ece2b178e6be54))
* **reply:** add floating quote preview ([b44fb15](https://github.com/bitsocialnet/5chan/commit/b44fb150785ac7f04e73fb1e251eb25a635087b9))
* **settings:** add 'check for updates' button ([ca22841](https://github.com/bitsocialnet/5chan/commit/ca22841ea48114e5fbf143587911d0ae608da0c9))
* **settings:** add account data settings ([b2bfc24](https://github.com/bitsocialnet/5chan/commit/b2bfc2440da171e967fb3bc883df50c00fb32b80))
* **settings:** add blocked addresses setting ([42a6fb4](https://github.com/bitsocialnet/5chan/commit/42a6fb4a701898aae89657a98744290a423bad61))
* **settings:** add crypto wallets ([ae02eba](https://github.com/bitsocialnet/5chan/commit/ae02eba4df7253e4a01deb4a9a6065e71bc74e9d))
* **settings:** add expand all button ([91d2a5a](https://github.com/bitsocialnet/5chan/commit/91d2a5ae014dd8498cb9d3284904db333fb2bf5d))
* **settings:** add interface settings category ([d78924f](https://github.com/bitsocialnet/5chan/commit/d78924facbd6c86995ee5c21075a0416b555a799))
* **settings:** add plebbit options ([bf09de9](https://github.com/bitsocialnet/5chan/commit/bf09de98f9ddf68965252d975c3fad72a097428a))
* **subplebbit:** add automatic theme based on nsfw or sfw tags ([22c1acd](https://github.com/bitsocialnet/5chan/commit/22c1acdd3dbe29cab05626018538dd4361b28933))
* **subplebbit:** add feed, posts ([f1af55e](https://github.com/bitsocialnet/5chan/commit/f1af55edf0069da7c3f016d93b2a67b7b68ab4dc))
* **topbar:** add search bar ([e39c171](https://github.com/bitsocialnet/5chan/commit/e39c171eac566daa447153e8bb6f3a71b494dcc6))


### Performance Improvements

* abstract reply modal logic into hook for post page and board page ([ff8882c](https://github.com/bitsocialnet/5chan/commit/ff8882ce9c32aac0034a6b09b18979eca0d26d1b))
* **app:** limit load of subplebbit with preload of layout ([9626c6c](https://github.com/bitsocialnet/5chan/commit/9626c6c9d8a24859ea9a206c41c3cdb0785f5750))
* apply cachebuster to not found img and board banners ([1f4213a](https://github.com/bitsocialnet/5chan/commit/1f4213ae0bc7279b6ba3cf441611b3fb3f3d9ad6))
* **app:** memoize board layout, update subplebbit view ([f4dba57](https://github.com/bitsocialnet/5chan/commit/f4dba57945cc70e624d57cf770f06a5fb9294e4d))
* **app:** optimize subs loading as much as possible ([311896d](https://github.com/bitsocialnet/5chan/commit/311896d1220477e2979b9bb8bd09afb0688d1639))
* **board nav:** reduce animation rerenders with useRef ([3eabe70](https://github.com/bitsocialnet/5chan/commit/3eabe70e1cf4e393be551dccc2367f04542d3974))
* **catalog:** optimize feed row rendering ([34f79bf](https://github.com/bitsocialnet/5chan/commit/34f79bf67d2e0c92c9e9967ac805fadea7d819de))
* **feed:** optimize postsPerPage ([b1e3400](https://github.com/bitsocialnet/5chan/commit/b1e3400d4424e5a0314077df6bdc32ef87ec099a))
* improve responsiveness ([62b83bf](https://github.com/bitsocialnet/5chan/commit/62b83bf7ea236404fe5d4b421ad084560eb88574))
* **markdown:** memoize ([af5a544](https://github.com/bitsocialnet/5chan/commit/af5a5443a717755f94a4819909fd0ae280485ac3))
* **post:** load post components conditionally ([50df786](https://github.com/bitsocialnet/5chan/commit/50df786a86e5efa8baa21afd89464a30ced1a78b))
* rewrite plebchan completely ([c4a5cfe](https://github.com/bitsocialnet/5chan/commit/c4a5cfec49c54f00f13599dd082b1b7140b0ce87))
* **use-theme:** refactor for performance, fix initial theme load after refresh ([3bb1b2f](https://github.com/bitsocialnet/5chan/commit/3bb1b2f8c1895349d6685cb73b5ef7aa213a7795))



## [0.1.17](https://github.com/bitsocialnet/5chan/compare/v0.1.16...v0.1.17) (2023-12-20)


### Bug Fixes

* **electron:** don't spam user with ipfs errors ([bc83a75](https://github.com/bitsocialnet/5chan/commit/bc83a75b04b363270d0d6bdc423bc41e49bbe3a1))
* **SettingsModal:** don't remove signer ([cd03fef](https://github.com/bitsocialnet/5chan/commit/cd03fefb25a2460724d30d2ff60c22610a1e68c4))



## [0.1.16](https://github.com/bitsocialnet/5chan/compare/v0.1.15...v0.1.16) (2023-12-18)


### Bug Fixes

* **SettingsModal:** don't show signer in account data preview ([f1f1eaa](https://github.com/bitsocialnet/5chan/commit/f1f1eaa2fe0a9cc7f7bb333fd8333b00ce6bf4e5))



## [0.1.15](https://github.com/bitsocialnet/5chan/compare/v0.1.14...v0.1.15) (2023-12-15)


### Bug Fixes

* add multisub.json ([b50dcef](https://github.com/bitsocialnet/5chan/commit/b50dcef2ab207aa0ded92b6950251c52a461a4eb))
* **share:** copy thread link to clipboard instead of post link when sharing a reply, because reply links aren't implemented yet on plebbit ([e2da7e7](https://github.com/bitsocialnet/5chan/commit/e2da7e7e9647a8f5feb346066e8212ed1cd76787))


### Features

* add 'view on seedit' links ([83c93c5](https://github.com/bitsocialnet/5chan/commit/83c93c5861cf96edfa9f0912eafa82f7c4d5ee80))
* **electron:** add plebbit rpc ([03b9b82](https://github.com/bitsocialnet/5chan/commit/03b9b82a6fbecba4658cc68d43523b9e862da298))
* **SettingsModal:** add export/import full account data ([07daa4e](https://github.com/bitsocialnet/5chan/commit/07daa4eeb315d13f756e4196253fe02d8a989284))
* **share:** add seedit to share button ([a13fe45](https://github.com/bitsocialnet/5chan/commit/a13fe45c6446527f52dac9dd25e32c4e23c364e3))



## [0.1.14](https://github.com/bitsocialnet/5chan/compare/v0.1.13...v0.1.14) (2023-10-22)


### Bug Fixes

* **anon mode:** use a different address also per each thread created by the user ([5747b26](https://github.com/bitsocialnet/5chan/commit/5747b264bfd1a6110a06e4fd6474a420511b553d))
* **App.js:** remove automatic dark mode, because it's not part of 4chan UX and it's not old school, and the selected style is saved anyway ([e3b577b](https://github.com/bitsocialnet/5chan/commit/e3b577b6900ba87be0aab85745038dfe40fb6c6a))
* **app:** new version info toast should only appear once ([bdb661b](https://github.com/bitsocialnet/5chan/commit/bdb661b0dc7317a37232c5a1869610b3efc1cbc0))
* **CaptchaModal:** improve captcha visibility by fixing margin ([a312c64](https://github.com/bitsocialnet/5chan/commit/a312c64bb047f155bdcfe77f5c1832fb75512479))
* **Catalog:** added missing post menu button to rules and description ([a7a845e](https://github.com/bitsocialnet/5chan/commit/a7a845eada43174bdf6df8846d7eb96011415474))
* **catalog:** fixed bugged appearance for posts without titles or content ([ac7ea57](https://github.com/bitsocialnet/5chan/commit/ac7ea57244da960f20c68fe1b7156c8682481d1a))
* **catalog:** key warnings ([87a019e](https://github.com/bitsocialnet/5chan/commit/87a019ed4f17b85e4770e21249191eeb3d810ac3))
* **EditLabel:** don't show the edit label if comment.original.content is identical to comment.content ([bcbf311](https://github.com/bitsocialnet/5chan/commit/bcbf311b952cc5b153b75a92f9840595ddd52c3e))
* **embed:** wrong srcdoc class syntax prevented some embeds from loading ([b8e3dcc](https://github.com/bitsocialnet/5chan/commit/b8e3dccbe222ff05e45611fc779ee269ed15e17f))
* **home:** ensure removed threads don't appear in popular threads box ([fee9e6f](https://github.com/bitsocialnet/5chan/commit/fee9e6fa08ccc944f386a31a403a95637e8f119c))
* **home:** fix displacement of threads while rendered in popular threads box ([06decd9](https://github.com/bitsocialnet/5chan/commit/06decd99e2f96c2c6e07e8fb8d5fafe5a8862707))
* **home:** fix rerender with useEffect dep ([c63ade8](https://github.com/bitsocialnet/5chan/commit/c63ade854b3eec55b4e267a9da8af8f19d15d314))
* **home:** remove fallback image warning ([eec7e5c](https://github.com/bitsocialnet/5chan/commit/eec7e5cd640ba554f8672ab3718f54b0444abba2))
* **Home:** remove preload of boards because it's resource-intensive and doesn't have concurrency maximum ([8758996](https://github.com/bitsocialnet/5chan/commit/8758996c970244783f02b9342564209bec146150))
* **hooks:** more accurate state strings ([2230049](https://github.com/bitsocialnet/5chan/commit/22300490ffb602201f5cccfccee0b0ea3aae9ba1))
* missing keys ([0939d65](https://github.com/bitsocialnet/5chan/commit/0939d658a5d1181af600f359af284d4cb5124b67))
* **mobile reply:** remove unnecessary width calculation for reply images ([8e4ca88](https://github.com/bitsocialnet/5chan/commit/8e4ca881ad1ed90b8d9cf3084c01df7a570c6986))
* **multifeed:** wrong feed data ([3964893](https://github.com/bitsocialnet/5chan/commit/3964893e25b2b227f4c85220d938b47eca722e47))
* **offline indicator:** check for online status every 30 minutes instead of 20 ([4eba8e7](https://github.com/bitsocialnet/5chan/commit/4eba8e7530516a798396696418e013251740481d))
* **post form:** make subject field optional, not mandatory ([548d491](https://github.com/bitsocialnet/5chan/commit/548d4914bf1924e4312f5baa2773c98d027d011a))
* **Post Form:** use defaultValue for Name when displayName is defined ([c779c34](https://github.com/bitsocialnet/5chan/commit/c779c34243dea4c08c527929f4796b7bfe5f199c))
* **post:** fix misplaced pin and lock icons ([3a02990](https://github.com/bitsocialnet/5chan/commit/3a029906744c6f42d501567389ffa34ccf650b12))
* **post:** fix misplaced user address ([1a4f7ac](https://github.com/bitsocialnet/5chan/commit/1a4f7ac281d39dc99f0b4759e76611460d7442d8))
* **PostOnHover:** add embed thumbnail ([946606a](https://github.com/bitsocialnet/5chan/commit/946606ac1f4dbd73aad40a1af19a4b226545dd0b))
* **PostOnHover:** fix eslint warning ([c0fe218](https://github.com/bitsocialnet/5chan/commit/c0fe21888ecfe7f2e5263aa6693c8eecd1b6de88))
* **Post:** remove markdown links showing them as text ([a5a01a8](https://github.com/bitsocialnet/5chan/commit/a5a01a8732f9ddcfc46932db23c812c039e9b3fb))
* **Post:** remove unnecessary key property causing warning ([2d8ecaa](https://github.com/bitsocialnet/5chan/commit/2d8ecaa9a07a0cb0dda7cc30639228d2ee1d570c))
* **scroll:** resolve race condition in onClick scroll-to-top behavior ([d5715e2](https://github.com/bitsocialnet/5chan/commit/d5715e29eb796b11d5fb98827cc8f44097d63afe))
* **SettingsModal:** add page reload for automatic anon mode change for ENS name ([7f7c9ff](https://github.com/bitsocialnet/5chan/commit/7f7c9ffaf913d21ef78b8de44e6b1b662d2fc919))
* **settings:** typo bugged success toast ([379f3d0](https://github.com/bitsocialnet/5chan/commit/379f3d0ec95d4f018ebfa130fab3fc1f4c68de56))
* **Thread:** fix undefined ([fdebe14](https://github.com/bitsocialnet/5chan/commit/fdebe14cdb8134ece9d5161ce5c572862c4aec89))
* **Thread:** remove useless wrapper for webpage comment.link with no thumbnail ([e4b1fc6](https://github.com/bitsocialnet/5chan/commit/e4b1fc6d35c34c5c4108f20a0bd211ddb4031497))
* **thread:** replying to a reply didn't show the pending comment ([9f5f2d1](https://github.com/bitsocialnet/5chan/commit/9f5f2d16638101b3b7d86a15854f4838abcd200d))
* **usestatestring:** don't show updating state if comment/subplebbit is succeeded ([7169366](https://github.com/bitsocialnet/5chan/commit/7169366d11d433f6e30c4c213a8f9bcf0a02685c))
* **views:** add CSS effect for useAuthorAddress jank ([40a2ff9](https://github.com/bitsocialnet/5chan/commit/40a2ff94ea1fa80deb9f2384fc05f5e90d14590c))
* **views:** add missing parser for quote links in thread op content ([be8bed7](https://github.com/bitsocialnet/5chan/commit/be8bed74ef04162fe5824a1c6e9be2e39f356098))
* **views:** fix scrolling jank removing margin between desktop reply cards ([288ae4d](https://github.com/bitsocialnet/5chan/commit/288ae4d066d310f1e5df8d433124015b1c63c63e))


### Features

* **AdminListModal:** inform the user when a board doesn't have moderators yet ([8a81177](https://github.com/bitsocialnet/5chan/commit/8a81177dd23a750e70669b8176f00d2969e47069))
* **catalog post preview:** show displayName of last reply with thread.lastChildCid ([a15ad68](https://github.com/bitsocialnet/5chan/commit/a15ad68adb485b2471b04984a4aefbd8a1b9d827))
* **home:** boards box shows list of boards being moderated by the user ([fabec54](https://github.com/bitsocialnet/5chan/commit/fabec543bf0be636a63cdcbe693583cd5da215a2))
* **home:** improve popular threads box with much more accurate conditions ([053ec57](https://github.com/bitsocialnet/5chan/commit/053ec57bc45413d00b196f8b42d59d90178d21bb))
* **home:** recent threads box only shows posts with media ([de2ac49](https://github.com/bitsocialnet/5chan/commit/de2ac49c1f7ee4d7d2115a8bd438f0f04a9b5ff3))
* **home:** redesigned home to be more similar to 4chan, with boards box listing all boards and thread box showing recent threads ([685cbb3](https://github.com/bitsocialnet/5chan/commit/685cbb3c170dc343794c316e42693e937b1bbdfd))
* **ImageBanner:** add banner [#20](https://github.com/bitsocialnet/5chan/issues/20) ([65cd106](https://github.com/bitsocialnet/5chan/commit/65cd1060101c65bcba7d312a09e641fd9f81b02f))
* **imagebanner:** add new banner ([e9ec981](https://github.com/bitsocialnet/5chan/commit/e9ec981d652fad5bf431314c64b17694cdfbe98a))
* **SettingsModal:** add button to create an account and automatically switching to it, update setting description and modal width ([57c3f71](https://github.com/bitsocialnet/5chan/commit/57c3f71a22b151ea2aa04d4427249d2695d487be))
* **SettingsModal:** automatically disable anon mode and tell the user, detecting ENS name when importing account, saving account or saving ENS ([c59bbb6](https://github.com/bitsocialnet/5chan/commit/c59bbb6f50e8b89e516255b947e23b8bfa6022f9))
* **SettingsModal:** force keep the same account id when saving to allow faster account import ([eab5469](https://github.com/bitsocialnet/5chan/commit/eab546939d8be5abe599a25e5cad6538bf4d1b0f))
* **Share button:** add success toast for copying share link to clipboard ([f0c0e64](https://github.com/bitsocialnet/5chan/commit/f0c0e64d750c98e6d2cad80bc721ddff228aa523))
* **views:** show board admin role next to usernames, if any, with capcode colors and admin modal function ([e9cfdac](https://github.com/bitsocialnet/5chan/commit/e9cfdac18f7111a0fe42900c6f56133ce1819d14))


### Performance Improvements

* **board:** add overscan to virtuoso ([fd4bec0](https://github.com/bitsocialnet/5chan/commit/fd4bec03d100b11dfbf6b954bc28e7db43ae36f0))
* **board:** improve scroll on mobile ([183294a](https://github.com/bitsocialnet/5chan/commit/183294a66f69fded67c497f80fc52dddaee6bced))
* **board:** improve scroll removing hr margin glitch ([e33c3fb](https://github.com/bitsocialnet/5chan/commit/e33c3fbe950660815b788863565429f231e8ecd0))
* **board:** remove redundant margin, might impact virtuoso ([a7398f5](https://github.com/bitsocialnet/5chan/commit/a7398f5338683ee43d08e2dce6a09c85a7b89cb2))
* **board:** replace margin with padding on mobile ([6eee096](https://github.com/bitsocialnet/5chan/commit/6eee096934feab60d93b90de202994eac6f2f563))
* **home:** add key to map, remove dep causing a loop ([a53f290](https://github.com/bitsocialnet/5chan/commit/a53f2905d1348ceb54189565ad0f956ac1923efa))



## [0.1.12](https://github.com/bitsocialnet/5chan/compare/v0.1.11...v0.1.12) (2023-09-18)


### Bug Fixes

* show new version info toast only once ([3f33dcb](https://github.com/bitsocialnet/5chan/commit/3f33dcb37a900ec5d0710842d7f0c9b0e4f0cf2e))


### Reverts

* Revert "add support for non-direct imgur links" ([be89323](https://github.com/bitsocialnet/5chan/commit/be8932343184a96d719cf5fd4a5032ce5162d12a))
* Revert "Update SettingsModal.jsx" ([5c72bc6](https://github.com/bitsocialnet/5chan/commit/5c72bc69e1c5e125c8c9348b3e2c5a0c877f5bdb))
* Revert "fix conditional useMemo" ([572ce08](https://github.com/bitsocialnet/5chan/commit/572ce0869adbc51fa5d5855152350fe041bad96f))



## [0.1.10](https://github.com/bitsocialnet/5chan/compare/v0.1.9...v0.1.10) (2023-08-10)


### Reverts

* Revert "add refresh button" ([f7ae7e7](https://github.com/bitsocialnet/5chan/commit/f7ae7e78dfb36391f39a28f444b86f90ddc1996e))



## [0.1.8](https://github.com/bitsocialnet/5chan/compare/v0.1.7...v0.1.8) (2023-06-09)



## [0.1.7](https://github.com/bitsocialnet/5chan/compare/v0.1.6...v0.1.7) (2023-06-08)


### Reverts

* Revert "refactor toasts" ([37d4966](https://github.com/bitsocialnet/5chan/commit/37d49668e4f4ae80bc9129a1061a00932bb63abd))



## [0.1.5](https://github.com/bitsocialnet/5chan/compare/v0.1.4...v0.1.5) (2023-05-12)



## [0.1.4](https://github.com/bitsocialnet/5chan/compare/v0.1.3...v0.1.4) (2023-05-11)



## [0.1.3](https://github.com/bitsocialnet/5chan/compare/v0.1.2...v0.1.3) (2023-05-06)



## [0.1.2](https://github.com/bitsocialnet/5chan/compare/v0.1.1...v0.1.2) (2023-04-29)



## [0.1.1](https://github.com/bitsocialnet/5chan/compare/v0.1.0...v0.1.1) (2023-04-27)



# [0.1.0](https://github.com/bitsocialnet/5chan/compare/0acd472a9fce50a66964d11750ee9e1275a49617...v0.1.0) (2023-04-24)


### Bug Fixes

* added png lowercase ([908dcd7](https://github.com/bitsocialnet/5chan/commit/908dcd77faa313e05d74c1e6865c29ae53ebceac))
* delete uppercase png ([0acd472](https://github.com/bitsocialnet/5chan/commit/0acd472a9fce50a66964d11750ee9e1275a49617))


### Reverts

* Revert "fix subplebbitAddress in ReplyModal" ([24b2177](https://github.com/bitsocialnet/5chan/commit/24b2177e8743785591a0947cbdb85bd87a9cdc56))
* Revert "removed markdown" ([33eec76](https://github.com/bitsocialnet/5chan/commit/33eec7644a564bc8825f48927b3a054858991744))
* Revert "fix touch bug" ([777935e](https://github.com/bitsocialnet/5chan/commit/777935ecbe1e3d781bc4bbadf8f824323acc8c8d))
* Revert "test InfiniteScroll" ([212a0c1](https://github.com/bitsocialnet/5chan/commit/212a0c10e8a563b75eb35f8d20ba8b93d0adec45))
* Revert "better lint, added InfiniteScroll, debugUtils" ([af0a4c6](https://github.com/bitsocialnet/5chan/commit/af0a4c67de33c544f997ec7bd64d94e5a5a41df3))
