$(function() {
	var config;
	var Page = (function() {
		
		config = {
			$bookBlock : $( '#bb-bookblock' ),
			$navNext : $( '#bb-nav-next' ),
			$navPrev : $( '#bb-nav-prev' ),
			$navFirst : $( '#bb-nav-first' ),
			$navLast : $( '#bb-nav-last' )
		},
		init = function() {
			config.$bookBlock.bookblock( {
				speed : 1000,
				shadowSides : 0.8,
				shadowFlip : 0.4,
				orientation: "vertical",
				onEndFlip : function(old, page, isLimit) { 
					return false; 
				},
			} );
			initEvents();
		},
		initEvents = function() {
			
			var $slides = config.$bookBlock.children();

			// add navigation events
			config.$navNext.on( 'click touchstart', function() {
				config.$bookBlock.bookblock( 'next' );
				return false;
			} );

			config.$navPrev.on( 'click touchstart', function() {
				config.$bookBlock.bookblock( 'prev' );
				return false;
			} );

			config.$navFirst.on( 'click touchstart', function() {
				config.$bookBlock.bookblock( 'first' );
				return false;
			} );

			config.$navLast.on( 'click touchstart', function() {
				config.$bookBlock.bookblock( 'last' );
				return false;
			} );
			
			// add swipe events
			$slides.on( {
				'swipeleft' : function( event ) {
					config.$bookBlock.bookblock( 'next' );
					return false;
				},
				'swiperight' : function( event ) {
					config.$bookBlock.bookblock( 'prev' );
					return false;
				}
			} );

			// add keyboard events
			$( document ).keydown( function(e) {
				var keyCode = e.keyCode || e.which,
					arrow = {
						left : 37,
						up : 38,
						right : 39,
						down : 40
					};

				switch (keyCode) {
					case arrow.left:
						config.$bookBlock.bookblock( 'prev' );
						break;
					case arrow.right:
						config.$bookBlock.bookblock( 'next' );
						break;
				}
			} );
		};

		return { init : init };

	})();
	
	/**
	 * Based on the following module. This code has been changed
	 * significantly -- importantly, it has be jquery-ified.
	 *
	 * modalEffects.js v1.0.0
	 * http://www.codrops.com
	 *
	 * Licensed under the MIT license.
	 * http://www.opensource.org/licenses/mit-license.php
	 * 
	 * Copyright 2013, Codrops
	 * http://www.codrops.com
	 */
	
	var $overlay = $('.md-overlay');

	$('.md-trigger').each(function() {

		var $this = $(this);
		var $modal = $('#' + $this.attr('data-modal'));

		function removeModal(hasPerspective) {
			$modal.removeClass('md-show');

			if(hasPerspective) {
				$(document).removeClass('md-perspective');
			}
		}

		function removeModalHandler() {
			removeModal($this.hasClass('md-setperspective')); 
		}

		$this.on("click", function(ev) {
			$modal.addClass('md-show');
			$overlay.off('click', removeModalHandler);
			$overlay.on('click', removeModalHandler);

			if($this.hasClass('md-setperspective')) {
				setTimeout(function() {
					$(document).addClass('md-perspective');
				}, 25);
			}
		});

		$modal.find('.md-close').on('click', function(ev) {
			ev.stopPropagation();
			removeModalHandler();
		});
	});
	
	//	Connect to server
	//
	var username = window.prompt("Username:","");
	var password = window.prompt("Password:","");

	var ev = new EventSource('/connect/' + encodeURIComponent(username) + '/' + encodeURIComponent(password));

	ev.addEventListener("open", function() {
		console.log("Connection opened");
	});

	ev.addEventListener("message", function(broadcast) {
		if(!broadcast || !broadcast.data || broadcast.data === "PING") {
			return;
		}
		var data = JSON.parse(broadcast.data);
		console.log(data);
		if(data.tickets) {
			$("#ticket-groups").html(data.tickets).accordion({
				speed       : 200,
				onOver      : function(trig, e) {
					trig.addClass('accordion-hover');
				},
				onOut       : function(trig, e) {
					trig.removeClass('accordion-hover');										
				},
				onOpen      : function(trig, e) {
					trig.addClass('accordion-selected');
				},
				onClose     : function(trig, e) {                    
					trig.removeClass('accordion-selected');
				}
			});
		}
		
		if(data.userProfile) {
			$("#user-profile").html(data.userProfile);
		}
		
		if(data.pagedTickets) {
			$("#bb-bookblock").append(data.pagedTickets);
			
			$(".summary-item").on("click", function() {
				var $this = $(this);
				config.$bookBlock.bookblock('jump', parseInt($this.attr('id')) +2);
			});

			$("#jump-to-index").on("click", function() {
				config.$bookBlock.bookblock('jump', 1);
			});
		
			Page.init();
		}
	});
});