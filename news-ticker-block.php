<?php
/**
 * Plugin Name:       News Ticker Block
 * Description:       A Gutenberg block that shows a scrolling news ticker with date-based promotions.
 * Version:           1.3.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            Toyinsola Adebayo
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       news-ticker-block
 * Domain Path:       /languages
 */

defined( 'ABSPATH' ) || exit;

define( 'NTB_VERSION', '1.3.0' );
define( 'NTB_PATH', plugin_dir_path( __FILE__ ) );
define( 'NTB_URL', plugin_dir_url( __FILE__ ) );

/**
 * Number of times the set of promotions is repeated per group in the server-rendered
 * markup. This is the no-JavaScript fallback; assets/view.js (front end) and
 * assets/block.js (editor) recalculate the exact number needed to fill the width.
 */
define( 'NTB_FALLBACK_REPEAT', 6 );

/**
 * Cache-busting version for an asset (falls back to the plugin version).
 *
 * @param string $relative_path Path relative to the plugin root.
 * @return string
 */
function ntb_asset_version( $relative_path ) {
	$file = NTB_PATH . $relative_path;
	return file_exists( $file ) ? (string) filemtime( $file ) : NTB_VERSION;
}

/**
 * Register assets and the block. Handles referenced in block.json are registered here
 * so we can control dependencies and versions.
 */
function ntb_register_block() {
	wp_register_script(
		'news-ticker-block-editor',
		NTB_URL . 'assets/block.js',
		array( 'wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-date', 'wp-i18n' ),
		ntb_asset_version( 'assets/block.js' ),
		true
	);
	wp_set_script_translations( 'news-ticker-block-editor', 'news-ticker-block', NTB_PATH . 'languages' );

	wp_register_script(
		'news-ticker-block-view',
		NTB_URL . 'assets/view.js',
		array(),
		ntb_asset_version( 'assets/view.js' ),
		true
	);

	wp_register_style(
		'news-ticker-block-style',
		NTB_URL . 'assets/style.css',
		array(),
		ntb_asset_version( 'assets/style.css' )
	);

	wp_register_style(
		'news-ticker-block-editor-style',
		NTB_URL . 'assets/editor-style.css',
		array(),
		ntb_asset_version( 'assets/editor-style.css' )
	);

	register_block_type(
		NTB_PATH,
		array( 'render_callback' => 'ntb_render_block' )
	);
}
add_action( 'init', 'ntb_register_block' );

/**
 * Parse a date string. Strings without an explicit offset are treated as
 * site-local time (which is what the editor's DateTimePicker produces).
 *
 * @param mixed        $value Date string.
 * @param DateTimeZone $tz    Site timezone.
 * @return DateTimeImmutable|null
 */
function ntb_parse_date( $value, DateTimeZone $tz ) {
	if ( ! is_string( $value ) || '' === $value ) {
		return null;
	}
	try {
		return new DateTimeImmutable( $value, $tz );
	} catch ( Exception $e ) {
		return null;
	}
}

/**
 * Build the HTML for a single promotion (optionally wrapped in a link).
 *
 * @param array $promo Promotion data.
 * @return string
 */
function ntb_render_item( $promo ) {
	$text = esc_html( $promo['message'] );
	$url  = ! empty( $promo['url'] ) && is_string( $promo['url'] ) ? esc_url( $promo['url'] ) : '';

	if ( $url ) {
		$target = ! empty( $promo['newTab'] ) ? ' target="_blank" rel="noopener noreferrer"' : '';
		$text   = '<a href="' . $url . '"' . $target . '>' . $text . '</a>';
	}

	return '<span class="ticker-item">' . $text . '</span>';
}

/**
 * Render callback.
 *
 * @param array $attributes Block attributes.
 * @return string
 */
function ntb_render_block( $attributes ) {
	$promotions = isset( $attributes['promotions'] ) && is_array( $attributes['promotions'] )
		? $attributes['promotions']
		: array();
	$bg_color   = isset( $attributes['backgroundColor'] ) ? sanitize_hex_color( $attributes['backgroundColor'] ) : '';
	$text_color = isset( $attributes['textColor'] ) ? sanitize_hex_color( $attributes['textColor'] ) : '';
	$speed      = isset( $attributes['scrollSpeed'] ) ? max( 3, (float) $attributes['scrollSpeed'] ) : 15;

	$tz  = wp_timezone();
	$now = new DateTimeImmutable( 'now', $tz );

	$items = array();
	foreach ( $promotions as $promo ) {
		if ( ! is_array( $promo ) || empty( $promo['message'] ) || ! is_string( $promo['message'] ) ) {
			continue;
		}
		$start = ntb_parse_date( isset( $promo['startDate'] ) ? $promo['startDate'] : '', $tz );
		$end   = ntb_parse_date( isset( $promo['endDate'] ) ? $promo['endDate'] : '', $tz );
		if ( $start && $end && $now >= $start && $now <= $end ) {
			$items[] = ntb_render_item( $promo );
		}
	}

	if ( empty( $items ) ) {
		return ''; // Nothing to show to visitors.
	}

	$separator = '<span class="ticker-separator" aria-hidden="true">|</span>';
	$one_set   = '<span class="ticker-set">' . implode( $separator, $items ) . $separator . '</span>';

	// Fallback repeat count; assets/view.js replaces it with the exact number needed.
	$group_html = str_repeat( $one_set, NTB_FALLBACK_REPEAT );

	// The second group is a visual duplicate for the seamless loop: hide it from
	// screen readers and keyboard focus.
	$group_a = '<div class="ticker-group">' . $group_html . '</div>';
	$group_b = '<div class="ticker-group" aria-hidden="true">'
		. str_replace( '<a ', '<a tabindex="-1" ', $group_html )
		. '</div>';

	$style = array();
	if ( $bg_color ) {
		$style[] = 'background-color:' . $bg_color;
	}
	if ( $text_color ) {
		$style[] = 'color:' . $text_color;
	}

	$wrapper = get_block_wrapper_attributes(
		array(
			'class' => 'news-ticker',
			'style' => implode( ';', $style ),
		)
	);

	return sprintf(
		'<div %1$s><div class="ticker-track" style="animation-duration:%2$ss">%3$s%4$s</div></div>',
		$wrapper,
		esc_attr( $speed ),
		$group_a,
		$group_b
	);
}