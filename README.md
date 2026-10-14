# News Ticker Block

A Gutenberg block that displays a scrolling ticker of promotions scheduled by start and end date/time (interpreted in the site's timezone).

## Features
- Schedule promotions with start and end date/time
- Edit and duplicate existing promotions
- Optional link per promotion, with open-in-new-tab
- Editor preview that matches the front end (inactive promotions are dimmed and labelled Active / Scheduled / Expired)
- Continuous loop, even with a single short promotion
- Custom background and text colors, adjustable loop duration
- Pauses on hover/focus and respects `prefers-reduced-motion`

## Requirements
- WordPress 6.2+
- PHP 7.4+

## Install
Download the latest zip from [Releases](../../releases), then in WordPress go to **Plugins → Add New → Upload Plugin**. Or clone into `wp-content/plugins/`.

## Usage
1. Insert the **News Ticker** block.
2. In the sidebar, enter a message, optional link, and start/end date-times, then click **Add Promotion**.
3. Use **Edit**, **Duplicate** or **Remove** in the Promotions panel.
4. Update the post to save.

## Known limitations
- The block renders nothing on the front end when no promotion is active.
- The editor preview shows inactive promotions (dimmed) so scheduled content is visible while editing.
- The loop duration is a fixed number of seconds, so scroll speed varies with message length.
- Page caches can show a stale ticker around a start/end time. Clear or shorten your cache lifetime if timing is critical.

## Development
No build step. Edit the files in place.

Build an installable zip from a clean checkout:

```bash
git archive --format=zip --prefix=news-ticker-block/ -o news-ticker-block.zip HEAD
```

## License
GPL-2.0-or-later. See [LICENSE](LICENSE).