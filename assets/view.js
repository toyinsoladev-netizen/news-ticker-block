/**
 * News Ticker Block: front-end enhancement.
 *
 * The server renders two identical groups of promotion "sets". For a seamless loop,
 * each group must be at least as wide as the ticker. This script measures one set and
 * repeats it as many times as needed, then keeps that in sync on resize.
 */
( function () {
	'use strict';

	var MAX_REPEAT = 200;

	function fill( group, template, count, hidden ) {
		var i, j, set, links;
		while ( group.firstChild ) {
			group.removeChild( group.firstChild );
		}
		for ( i = 0; i < count; i++ ) {
			set = template.cloneNode( true );
			if ( hidden ) {
				// The duplicate group is aria-hidden, so keep its links out of the tab order.
				links = set.querySelectorAll( 'a' );
				for ( j = 0; j < links.length; j++ ) {
					links[ j ].setAttribute( 'tabindex', '-1' );
				}
			}
			group.appendChild( set );
		}
	}

	function init( ticker ) {
		var track = ticker.querySelector( '.ticker-track' );
		if ( ! track ) {
			return;
		}
		var groups = track.querySelectorAll( '.ticker-group' );
		if ( groups.length !== 2 ) {
			return;
		}
		var firstSet = groups[ 0 ].querySelector( '.ticker-set' );
		if ( ! firstSet ) {
			return;
		}

		var template = firstSet.cloneNode( true );
		var current = 0;
		var frame = 0;

		function update() {
			frame = 0;
			var set = groups[ 0 ].querySelector( '.ticker-set' );
			if ( ! set ) {
				return;
			}
			var setWidth = set.getBoundingClientRect().width;
			var containerWidth = ticker.clientWidth;
			if ( setWidth <= 0 || containerWidth <= 0 ) {
				return;
			}
			var needed = Math.min( MAX_REPEAT, Math.max( 1, Math.ceil( containerWidth / setWidth ) ) );
			if ( needed === current ) {
				return;
			}
			current = needed;
			fill( groups[ 0 ], template, needed, false );
			fill( groups[ 1 ], template, needed, true );
		}

		function schedule() {
			if ( ! frame ) {
				frame = window.requestAnimationFrame( update );
			}
		}

		schedule();

		if ( 'ResizeObserver' in window ) {
			new ResizeObserver( schedule ).observe( ticker );
		} else {
			window.addEventListener( 'resize', schedule );
		}
		window.addEventListener( 'load', schedule );
		if ( document.fonts && document.fonts.ready ) {
			document.fonts.ready.then( schedule );
		}
	}

	function run() {
		// With reduced motion the CSS shows a single static set, so there is nothing to build.
		if ( window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches ) {
			return;
		}
		var tickers = document.querySelectorAll( '.news-ticker' );
		for ( var i = 0; i < tickers.length; i++ ) {
			init( tickers[ i ] );
		}
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', run );
	} else {
		run();
	}
} )();