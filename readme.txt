=== News Ticker Block ===
Contributors: toyinsolaa
Tags: block, ticker, news, promotions, announcement
Requires at least: 6.2
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.3.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A Gutenberg block that shows a scrolling ticker of date-scheduled promotions.

== Description ==
Add the News Ticker block, schedule promotions with start and end dates and times, and active promotions scroll across the page in a continuous loop. Dates are interpreted in your site's timezone. Nothing is shown to visitors when no promotion is active.

Features:

* Schedule promotions with start and end date/time.
* Edit and duplicate existing promotions.
* Optional link per promotion, with open-in-new-tab.
* Editor preview that looks like the front end; inactive promotions are dimmed and labelled Active, Scheduled or Expired.
* Seamless loop, even with a single short promotion.
* Custom background and text colors, adjustable loop duration.
* Pauses on hover and focus; respects reduced-motion preferences.

== Installation ==
1. Upload the `news-ticker-block` folder to `/wp-content/plugins/`.
2. Activate the plugin.
3. Add the "News Ticker" block to any post or page.

== Changelog ==
= 1.3.0 =
* New: edit and duplicate existing promotions.
* New: optional link per promotion, with open-in-new-tab.
* New: editor preview that matches the front end, with Active/Scheduled/Expired status.
* New: seamless continuous loop for short or single promotions.
* New: block.json registration and translation-ready editor strings.
* Improved: Add Promotion validates the message and date range; dates default to now.
* Improved: reduced-motion users see a static, readable list instead of clipped text.
* Requires WordPress 6.2 or later.

= 1.2.0 =
* Fix: promotions never appearing due to timezone mismatch.
* Seamless CSS-only loop, color and speed controls.