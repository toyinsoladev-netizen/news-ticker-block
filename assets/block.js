( function ( blocks, element, blockEditor, components, date, i18n ) {
	var el = element.createElement;
	var Fragment = element.Fragment;
	var useState = element.useState;
	var useRef = element.useRef;
	var useEffect = element.useEffect;
	var InspectorControls = blockEditor.InspectorControls;
	var useBlockProps = blockEditor.useBlockProps;
	var PanelBody = components.PanelBody;
	var TextControl = components.TextControl;
	var ToggleControl = components.ToggleControl;
	var RangeControl = components.RangeControl;
	var ColorPalette = components.ColorPalette;
	var DateTimePicker = components.DateTimePicker;
	var Button = components.Button;
	var __ = i18n.__;

	var FALLBACK_REPEAT = 6; // Keep in sync with NTB_FALLBACK_REPEAT in PHP.
	var MAX_REPEAT = 200;
	var DATE_FORMAT = 'Y-m-d\\TH:i:s';
	var DAY_MS = 86400000;

	/* ---------- Dates ---------- */

	// Current site-local time (optionally offset by N days) in the picker's format.
	function nowString( offsetDays ) {
		return date.format( DATE_FORMAT, new Date( Date.now() + ( offsetDays || 0 ) * DAY_MS ) );
	}

	function fmt( value ) {
		return date.dateI18n( 'M j, Y g:i a', value );
	}

	function isFuture( value ) {
		return date.isInTheFuture( value );
	}

	function getStatus( p ) {
		if ( ! p.startDate || ! p.endDate ) {
			return 'invalid';
		}
		if ( isFuture( p.startDate ) ) {
			return 'scheduled';
		}
		if ( ! isFuture( p.endDate ) ) {
			return 'expired';
		}
		return 'active';
	}

	function statusLabel( status ) {
		var labels = {
			active: __( 'Active', 'news-ticker-block' ),
			scheduled: __( 'Scheduled', 'news-ticker-block' ),
			expired: __( 'Expired', 'news-ticker-block' ),
			invalid: __( 'Invalid dates', 'news-ticker-block' ),
		};
		return labels[ status ];
	}

	/* ---------- Preview markup (mirrors ntb_render_block() in PHP) ---------- */

	function renderItem( promo, index ) {
		var inactive = getStatus( promo ) !== 'active';
		var content = promo.url
			? el(
					'a',
					{
						href: promo.url,
						onClick: function ( e ) {
							e.preventDefault(); // Don't navigate away from the editor.
						},
					},
					promo.message
			  )
			: promo.message;

		return el(
			'span',
			{ key: 'item-' + index, className: 'ticker-item' + ( inactive ? ' is-inactive' : '' ) },
			content
		);
	}

	function renderSet( promotions, key ) {
		var children = [];
		promotions.forEach( function ( promo, i ) {
			children.push( renderItem( promo, i ) );
			children.push(
				el( 'span', { key: 'sep-' + i, className: 'ticker-separator', 'aria-hidden': 'true' }, '|' )
			);
		} );
		return el( 'span', { key: key, className: 'ticker-set' }, children );
	}

	function renderGroup( promotions, key, hidden, repeat ) {
		var sets = [];
		for ( var i = 0; i < repeat; i++ ) {
			sets.push( renderSet( promotions, 'set-' + i ) );
		}
		return el(
			'div',
			{
				key: key,
				className: 'ticker-group',
				'aria-hidden': hidden ? 'true' : undefined,
			},
			sets
		);
	}

	/**
	 * Live preview. Measures one set and repeats it until each group is wider than the
	 * block, the same approach as assets/view.js on the front end.
	 */
	function TickerPreview( props ) {
		var promotions = props.promotions;
		var trackRef = useRef( null );
		var repeatState = useState( FALLBACK_REPEAT );
		var repeat = repeatState[ 0 ];
		var setRepeat = repeatState[ 1 ];

		var signature = JSON.stringify(
			promotions.map( function ( p ) {
				return [ p.message, p.url ];
			} )
		);

		useEffect(
			function () {
				var track = trackRef.current;
				if ( ! track || ! track.parentElement ) {
					return undefined;
				}
				var container = track.parentElement;
				var frame = 0;

				function measure() {
					frame = 0;
					var set = track.querySelector( '.ticker-set' );
					if ( ! set ) {
						return;
					}
					var setWidth = set.getBoundingClientRect().width;
					if ( setWidth <= 0 || container.clientWidth <= 0 ) {
						return;
					}
					setRepeat(
						Math.min( MAX_REPEAT, Math.max( 1, Math.ceil( container.clientWidth / setWidth ) ) )
					);
				}

				function schedule() {
					if ( ! frame ) {
						frame = window.requestAnimationFrame( measure );
					}
				}

				schedule();

				var observer = null;
				if ( 'ResizeObserver' in window ) {
					observer = new window.ResizeObserver( schedule );
					observer.observe( container );
				} else {
					window.addEventListener( 'resize', schedule );
				}

				return function () {
					if ( frame ) {
						window.cancelAnimationFrame( frame );
					}
					if ( observer ) {
						observer.disconnect();
					} else {
						window.removeEventListener( 'resize', schedule );
					}
				};
			},
			[ signature ]
		);

		return el(
			'div',
			props.blockProps,
			el(
				'div',
				{
					className: 'ticker-track',
					ref: trackRef,
					style: { animationDuration: props.duration + 's' },
				},
				renderGroup( promotions, 'group-a', false, repeat ),
				renderGroup( promotions, 'group-b', true, repeat )
			)
		);
	}

	blocks.registerBlockType( 'news-ticker-block/news-ticker', {
		// Title, icon, category and attributes come from block.json.

		edit: function ( props ) {
			var attrs = props.attributes;
			var setAttributes = props.setAttributes;
			var promotions = attrs.promotions || [];

			var s1 = useState( function () {
					return nowString( 0 );
				} ),
				startDate = s1[ 0 ],
				setStartDate = s1[ 1 ];
			var s2 = useState( function () {
					return nowString( 7 );
				} ),
				endDate = s2[ 0 ],
				setEndDate = s2[ 1 ];
			var s3 = useState( '' ), message = s3[ 0 ], setMessage = s3[ 1 ];
			var s4 = useState( '' ), url = s4[ 0 ], setUrl = s4[ 1 ];
			var s5 = useState( false ), newTab = s5[ 0 ], setNewTab = s5[ 1 ];
			var s6 = useState( null ), editingIndex = s6[ 0 ], setEditingIndex = s6[ 1 ];

			var isEditing = editingIndex !== null;

			var hasMessage = message.trim() !== '';
			var rangeValid = !! startDate && !! endDate && new Date( endDate ) > new Date( startDate );
			var canSave = hasMessage && rangeValid;
			var hint = '';
			if ( ! hasMessage ) {
				hint = __( 'Enter a message.', 'news-ticker-block' );
			} else if ( ! rangeValid ) {
				hint = __( 'The end date must be after the start date.', 'news-ticker-block' );
			}

			function resetForm() {
				setStartDate( nowString( 0 ) );
				setEndDate( nowString( 7 ) );
				setMessage( '' );
				setUrl( '' );
				setNewTab( false );
				setEditingIndex( null );
			}

			function loadIntoForm( p, index ) {
				setStartDate( p.startDate || nowString( 0 ) );
				setEndDate( p.endDate || nowString( 7 ) );
				setMessage( p.message || '' );
				setUrl( p.url || '' );
				setNewTab( !! p.newTab );
				setEditingIndex( index );
			}

			function startEdit( index ) {
				loadIntoForm( promotions[ index ], index );
			}

			function duplicatePromotion( index ) {
				var copy = Object.assign( {}, promotions[ index ] );
				var updated = promotions.slice();
				updated.splice( index + 1, 0, copy );
				setAttributes( { promotions: updated } );
				// Open the copy for editing straight away.
				loadIntoForm( copy, index + 1 );
			}

			function savePromotion() {
				if ( ! canSave ) {
					return;
				}
				var promo = {
					startDate: startDate,
					endDate: endDate,
					message: message.trim(),
					url: url.trim(),
					newTab: newTab,
				};
				var updated = isEditing
					? promotions.map( function ( p, i ) {
							return i === editingIndex ? promo : p;
					  } )
					: promotions.concat( [ promo ] );
				setAttributes( { promotions: updated } );
				resetForm();
			}

			function removePromotion( index ) {
				setAttributes( {
					promotions: promotions.filter( function ( _, i ) {
						return i !== index;
					} ),
				} );
				if ( editingIndex === index ) {
					resetForm();
				} else if ( isEditing && index < editingIndex ) {
					setEditingIndex( editingIndex - 1 );
				}
			}

			var formKey = isEditing ? 'edit-' + editingIndex : 'new';

			/* ---------- Block canvas: live preview ---------- */

			var blockProps = useBlockProps( {
				className: 'news-ticker',
				style: {
					backgroundColor: attrs.backgroundColor,
					color: attrs.textColor,
				},
			} );

			var preview =
				promotions.length === 0
					? el(
							'div',
							blockProps,
							el(
								'div',
								{ className: 'ntb-empty' },
								__( 'News Ticker: add a promotion in the sidebar.', 'news-ticker-block' )
							)
					  )
					: el( TickerPreview, {
							promotions: promotions,
							blockProps: blockProps,
							duration: attrs.scrollSpeed,
					  } );

			/* ---------- Sidebar ---------- */

			var list =
				promotions.length === 0
					? el( 'p', { className: 'ntb-list-empty' }, __( 'No promotions yet.', 'news-ticker-block' ) )
					: el(
							'div',
							{ className: 'ntb-list' },
							promotions.map( function ( promo, index ) {
								var status = getStatus( promo );
								return el(
									'div',
									{
										key: index,
										className:
											'ntb-list-item' + ( index === editingIndex ? ' is-editing' : '' ),
									},
									el(
										'div',
										{ className: 'ntb-list-text' },
										el( 'strong', {}, promo.message ),
										el(
											'span',
											{ className: 'ntb-list-meta' },
											fmt( promo.startDate ) + ' – ' + fmt( promo.endDate )
										),
										promo.url
											? el( 'span', { className: 'ntb-list-meta' }, '🔗 ' + promo.url )
											: null,
										el( 'span', { className: 'ntb-badge is-' + status }, statusLabel( status ) )
									),
									el(
										'div',
										{ className: 'ntb-list-actions' },
										el(
											Button,
											{
												variant: 'link',
												onClick: function () {
													startEdit( index );
												},
											},
											__( 'Edit', 'news-ticker-block' )
										),
										el(
											Button,
											{
												variant: 'link',
												onClick: function () {
													duplicatePromotion( index );
												},
											},
											__( 'Duplicate', 'news-ticker-block' )
										),
										el(
											Button,
											{
												variant: 'link',
												isDestructive: true,
												onClick: function () {
													removePromotion( index );
												},
											},
											__( 'Remove', 'news-ticker-block' )
										)
									)
								);
							} )
					  );

			return el(
				Fragment,
				{},
				el(
					InspectorControls,
					{},
					el(
						PanelBody,
						{ title: __( 'Promotions', 'news-ticker-block' ), initialOpen: true },
						list
					),
					el(
						PanelBody,
						{
							title: isEditing
								? __( 'Edit promotion', 'news-ticker-block' )
								: __( 'Add promotion', 'news-ticker-block' ),
							initialOpen: true,
						},
						el( TextControl, {
							label: __( 'Message', 'news-ticker-block' ),
							value: message,
							onChange: setMessage,
							__nextHasNoMarginBottom: true,
							__next40pxDefaultSize: true,
						} ),
						el( TextControl, {
							label: __( 'Link URL (optional)', 'news-ticker-block' ),
							type: 'url',
							placeholder: 'https://example.com/sale',
							value: url,
							onChange: setUrl,
							__nextHasNoMarginBottom: true,
							__next40pxDefaultSize: true,
						} ),
						el( ToggleControl, {
							label: __( 'Open link in new tab', 'news-ticker-block' ),
							checked: newTab,
							onChange: setNewTab,
							__nextHasNoMarginBottom: true,
						} ),
						el( 'p', { className: 'ntb-label' }, __( 'Start', 'news-ticker-block' ) ),
						el( DateTimePicker, {
							key: formKey + '-start',
							currentDate: startDate || undefined,
							onChange: setStartDate,
						} ),
						el( 'p', { className: 'ntb-label' }, __( 'End', 'news-ticker-block' ) ),
						el( DateTimePicker, {
							key: formKey + '-end',
							currentDate: endDate || undefined,
							onChange: setEndDate,
						} ),
						hint ? el( 'p', { className: 'ntb-hint' }, hint ) : null,
						el(
							'div',
							{ className: 'ntb-form-buttons' },
							el(
								Button,
								{ variant: 'primary', onClick: savePromotion, disabled: ! canSave },
								isEditing
									? __( 'Save changes', 'news-ticker-block' )
									: __( 'Add Promotion', 'news-ticker-block' )
							),
							isEditing &&
								el(
									Button,
									{ variant: 'secondary', onClick: resetForm },
									__( 'Cancel', 'news-ticker-block' )
								)
						)
					),
					el(
						PanelBody,
						{ title: __( 'Appearance', 'news-ticker-block' ), initialOpen: false },
						el( 'p', { className: 'ntb-label' }, __( 'Background color', 'news-ticker-block' ) ),
						el( ColorPalette, {
							value: attrs.backgroundColor,
							onChange: function ( c ) {
								setAttributes( { backgroundColor: c || '#222222' } );
							},
						} ),
						el( 'p', { className: 'ntb-label' }, __( 'Text color', 'news-ticker-block' ) ),
						el( ColorPalette, {
							value: attrs.textColor,
							onChange: function ( c ) {
								setAttributes( { textColor: c || '#ffffff' } );
							},
						} ),
						el( RangeControl, {
							label: __( 'Loop duration (seconds)', 'news-ticker-block' ),
							value: attrs.scrollSpeed,
							min: 3,
							max: 120,
							onChange: function ( v ) {
								setAttributes( { scrollSpeed: v || 15 } );
							},
							__nextHasNoMarginBottom: true,
							__next40pxDefaultSize: true,
						} )
					)
				),
				preview
			);
		},

		save: function () {
			return null; // Rendered in PHP.
		},
	} );
} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.blockEditor,
	window.wp.components,
	window.wp.date,
	window.wp.i18n
);