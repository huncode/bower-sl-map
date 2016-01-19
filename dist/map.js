/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _map = __webpack_require__(1);

	var _map2 = _interopRequireDefault(_map);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	angular.module('sl.map', ['ngMap', 'sl.outlets', 'sl.regions']).directive('slMap', function () {
	  return new _map2.default();
	});

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var mapTpl = __webpack_require__(2);

	var Map = function Map() {
	  _classCallCheck(this, Map);

	  this.scope = true;
	  this.bindToController = {
	    outletsRemains: '@slMapFilter',
	    selectedSize: '@slMapRemainsSize'
	  };
	  this.controller = MapController;
	  this.controllerAs = 'slMap';
	  this.templateUrl = mapTpl;
	};

	var MapController = (function () {

	  /*
	   Логика:
	   - при выборе региона отображается ТТ региона
	   - при отдалении карты - показываются в первую очередь ТТ выбранного региона
	   - при поиске в первую очередь показываются ТТ выбранного региона
	   - во вторую очередь в перечисленных случаях отображаются ТТ других регионов отсортированные по типу
	   - От первой очереди вторая отделена подчеркнутым заголовком "В других регионах"
	   Техника:
	   - запрос точек по региону при ините
	   - отрисовка точек по всей россии
	   - добавление точек по региону в список справа
	   - при поиске по названию/адресу - поиск среди всех точек по РФ
	   - при выборе точки показывать список ТТ региона (если поле поиска пустое) или оставлять найденные ТТ (если заполнено поле поиска)
	   - при зуме (и отсутствии выбранной точки) показывать точки которые находятся на карте
	   - если включены остатки, показывать остатки по региону, когда увеличиваем зум и попадаем на точки другого региона - добавляем к ним остатки запросом в батч
	    TODO:
	   -- вернуть увеличение списка при отдалении
	   -- крестик вынести за попап
	   -- переключение на карту мобильный вид
	   -- отцентровать активную иконку
	   */

	  /**
	   @ngInject
	   */

	  function MapController(NgMap, Remains, Regions, Outlets, $http, $scope, $timeout, $rootScope, $window, $q) {
	    var _this = this;

	    _classCallCheck(this, MapController);

	    this.NgMap = NgMap;
	    this.Remains = Remains;
	    this.Regions = Regions;
	    this.Outlets = Outlets;
	    this.$scope = $scope;
	    this.$timeout = $timeout;
	    this.$window = $window;
	    this.$q = $q;
	    this.$http = $http;
	    this.model = {};
	    this.isMobile = /android|ip(hone|ad|od)/i.test($window.navigator.userAgent);
	    this.selectedSize = this.selectedSize || 0;
	    this.init();

	    $rootScope.$on('mapShow', function (event, outlet) {
	      $timeout(function () {
	        _this.select(outlet || { id: null });
	        _this.render();
	      });
	    });

	    $rootScope.$on('region:change', function (event, regionId) {
	      _this.setRegion(regionId, true);
	      _this.model.location = Regions.current;
	      _this.init();
	    });
	  }

	  _createClass(MapController, [{
	    key: 'init',
	    value: function init() {
	      this.$q.all({
	        regions: this.Regions.fetch(),
	        outlets: this.Outlets.fetch(),
	        map: this.NgMap.getMap()
	      }).then(this.setModel.bind(this));
	    }
	  }, {
	    key: 'setModel',
	    value: function setModel(responses) {
	      this.regions = this.Regions.all;
	      this.outlets = responses.outlets;
	      this.map = responses.map;
	      this.map._controller = this;
	      this.map.width = this.$window.outerWidth;
	      this.map.height = this.$window.outerHeight;
	      this.model.location = this.Regions.current;
	      this.defaultIcon = {
	        url: '/bower_components/sl-map/src/images/new/marker_full@2x.png',
	        size: [24, 32],
	        scaledSize: [24, 32],
	        origin: [0, 0]
	      };

	      this.initRemains();
	      this.render();
	    }
	  }, {
	    key: 'initRemains',
	    value: function initRemains() {
	      this.outletsRemains = this.outletsRemains && angular.fromJson(this.outletsRemains);
	      this.model.outlets = this.outletsRemains ? this.Outlets.byRegion(this.model.location.id).filter(this.filterRemains.bind(this)) : this.Outlets.byRegion(this.model.location.id);

	      if (!this.outletsRemains) return;

	      this.remains = this.reduceBySize(this.outletsRemains);
	    }
	  }, {
	    key: 'reduceBySize',
	    value: function reduceBySize(remainsArr) {
	      var _this2 = this;

	      var remains = remainsArr.reduce(function (remains, remain) {
	        var outlet = _this2.model.outlets.filter(function (_outlet) {
	          return _outlet.id === remain.outlet_id;
	        })[0];
	        if (!outlet || !remain.hasOwnProperty('available') && !remain.pickup) {
	          return remains;
	        }
	        if (!remains[remain.size]) {
	          remains[remain.size] = [];
	        }
	        outlet.remains = remain;
	        outlet.icon = _this2.getIcon(outlet);
	        remains[remain.size].push(outlet);

	        return remains;
	      }, {});

	      return remains;
	    }
	  }, {
	    key: 'pluckSize',
	    value: function pluckSize(size) {
	      if (!this.map) return;

	      if (this.outletsFilter) {
	        return this.outlets;
	      }

	      if (this.outletsRemains) {
	        return this.remains && (this.remains[size] || this.remains[this.selectedSize] || this.remains[0]);
	      }

	      return this.model.outlets;
	    }
	  }, {
	    key: 'fetchRemains',
	    value: function fetchRemains(outlet, regionId, index) {
	      var _this3 = this;

	      return this.Remains.fetch(null, regionId).then(function (response) {
	        _this3.outletsRemains.concat(response.data);
	        outlet.remains = response.data.filter(function (_remain) {
	          return _remain.outlet_id === outlet.id && Number(_this3.selectedSize) === _remain.size;
	        })[0];
	        outlet.icon = _this3.getIcon(outlet);

	        if (!outlet.remains) {
	          _this3.otherRegion.splice(index, 1);
	        }
	      });
	    }
	  }, {
	    key: 'getIcon',
	    value: function getIcon(outlet) {
	      if (!this.outletsRemains) {
	        return this.defaultIcon;
	      }

	      return angular.extend({}, this.defaultIcon, {
	        url: '/bower_components/sl-map/src/images/new/marker' + (outlet.remains && outlet.remains.hasOwnProperty('available') ? '_green' : '_gray') + '@2x.png'
	      });
	    }
	  }, {
	    key: 'setRegion',
	    value: function setRegion(regionId, externalSet) {
	      regionId = regionId || this.model.location.id;
	      this.back();
	      this.model.outlets = this.outletsRemains ? this.Outlets.byRegion(regionId).filter(this.filterRemains.bind(this)) : this.Outlets.byRegion(regionId);
	      if (!externalSet) this.Regions.setRegion(regionId);
	      this.render();
	    }
	  }, {
	    key: 'resize',
	    value: function resize() {
	      var _this4 = this;

	      if (this._resizeTimeout) this.$timeout.cancel(this._resizeTimeout);

	      this._resizeTimeout = this.$timeout(function () {
	        var outlets = _this4.model.outlets;

	        if (_this4.outletsRemains) {
	          outlets = _this4.remains && (_this4.remains[_this4.selectedSize] || _this4.remains[0]);
	        }

	        if (_this4.selected && _this4.map.zoom >= 14) {
	          return;
	        }

	        var bounds = _this4.map.getBounds();

	        _this4.filtered = outlets.filter(function (outlet) {
	          return bounds.contains(_this4.gm('LatLng', outlet.geo[0], outlet.geo[1]));
	        });

	        if (_this4.outletsFilter) {
	          _this4.otherRegion = _this4.outlets.filter(function (outlet) {
	            if (outlet.region_id[0] === _this4.model.location.id) {
	              return false;
	            }

	            _this4.fetchRemains(outlet, outlet.region_id[0]);
	            return true;
	          });

	          return;
	        }

	        _this4.otherRegion = _this4.outlets.filter(function (outlet) {
	          if (outlet.region_id[0] === _this4.model.location.id) return;

	          if (!bounds.contains(_this4.gm('LatLng', outlet.geo[0], outlet.geo[1]))) return;

	          if (_this4.outletsRemains) {
	            _this4.fetchRemains(outlet, outlet.region_id[0]);
	          }
	          return true;
	        });

	        _this4.emptyList = !_this4.otherRegion.length && !_this4.filtered.length;
	      }, 450);
	    }
	  }, {
	    key: 'render',
	    value: function render() {
	      var _this5 = this;

	      if (!this.model.outlets) return;
	      this.bounds = this.gm('LatLngBounds');
	      this.model.outlets.forEach(function (outlet) {
	        if (outlet.geo && outlet.geo.length) {
	          var marker = _this5.gm('LatLng', outlet.geo[0], outlet.geo[1]);
	          _this5.bounds.extend(marker);
	        }
	      });
	      this.$window.google.maps.event.trigger(this.map, 'resize');

	      if (this.selected) return;
	      this.map.fitBounds(this.bounds);
	      this.map.panToBounds(this.bounds);
	      if (this.map.zoom > 14) this.map.setZoom(14);
	    }
	  }, {
	    key: 'select',
	    value: function select(outlet) {
	      if (!outlet) return;
	      if (outlet.selected) return this.back();
	      var center = this.gm('LatLng', outlet.geo[0], outlet.geo[1] + .0075);

	      if (this.isMobile) {
	        center = this.gm('LatLng', outlet.geo[0] + .0035, outlet.geo[1]);
	        this.isMapActive = true;
	      }

	      if (this.map.zoom <= 14) {
	        this._previousState = {
	          center: this.map.getCenter(),
	          zoom: this.map.zoom
	        };
	      }

	      this.outlets.forEach(function (_outlet) {
	        var equal = _outlet.id === outlet.id;
	        if (equal) {
	          _outlet.remains = outlet.remains;
	        }
	        _outlet.selected = _outlet.id === outlet.id;
	      });

	      this.openInfo(outlet);
	      this.$window.google.maps.event.trigger(this.map, 'resize');
	      this.map.setCenter(center);
	      if (this.selected || this.map.zoom < 15) this.map.setZoom(15);
	    }
	  }, {
	    key: 'back',
	    value: function back() {
	      if (this.selected) {
	        this.selected.icon = this.getIcon(this.selected);
	        this.selected.selected = false;
	        this.selected = null;
	        this.map.setCenter(this._previousState.center);
	        this.map.setZoom(this._previousState.zoom);

	        if (this.isMobile) this.isMapActive = false;
	      }
	    }
	  }, {
	    key: 'filterRemains',
	    value: function filterRemains(outlet) {
	      return this.outletsRemains.filter(function (_remain) {
	        return _remain.outlet_id === outlet.id;
	      }).length;
	    }
	  }, {
	    key: 'openInfo',
	    value: function openInfo(outlet) {
	      var _this6 = this;

	      this.selected = outlet;
	      this.selected.icon = angular.extend({}, this.defaultIcon, {
	        url: '/bower_components/sl-map/src/images/new/marker-active.png'
	      });
	      this.$timeout(function () {
	        return _this6.scroll();
	      });

	      if (this.map.lastInfoWindow && this.map.lastInfoWindow !== outlet) {
	        this.map.lastInfoWindow.icon = '';
	      }

	      this.map.lastInfoWindow = outlet;
	    }
	  }, {
	    key: 'scroll',
	    value: function scroll() {
	      var list = document.querySelector('.adress-popup-list'); //eslint-disable-line angular/document-service
	      var selected = list.querySelector('.active');

	      if (!selected) {
	        return;
	      }

	      angular.element(list).animate({
	        scrollTop: selected.offsetTop - selected.offsetHeight
	      });
	      angular.element(document).scrollTop(window.pageYOffset + list.parentNode.getBoundingClientRect().top); //eslint-disable-line angular/document-service,angular/window-service
	    }
	  }, {
	    key: 'gm',
	    value: function gm(googleMapsMethod) {
	      var args = [null].concat(Array.prototype.slice.call(arguments, 1));
	      return new (Function.prototype.bind.apply(this.$window.google.maps[googleMapsMethod], args))();
	    }
	  }, {
	    key: 'showcase',
	    value: function showcase(refresh) {
	      var _this7 = this;

	      if (refresh) {
	        this._showcase = refresh;
	        this.$timeout(function () {
	          _this7.render();
	          _this7.select();
	        });
	      }

	      return this._showcase || this.remains ? 'list' : 'map';
	    }
	  }, {
	    key: 'proxify',
	    value: function proxify(event, method, outlet) {
	      var ctrl = this._controller || this.map && this.map._controller;
	      if (!ctrl) return;
	      ctrl[method].call(ctrl, outlet);
	    }
	  }], [{
	    key: 'getPrimary',
	    value: function getPrimary(images) {
	      return images && images.filter(function (image) {
	        return image.is_primary;
	      })[0];
	    }
	  }]);

	  return MapController;
	})();

	exports.default = Map;

/***/ },
/* 2 */
/***/ function(module, exports) {

	var path = '/home/eagavrilov/WebstormProjects/bower-sl-map/src/map.html';
	var html = "<div class=\"loader\" ng-show=\"!slMap.map\"></div>\n<div class=\"adress-popup\" map-lazy-load=\"http://maps.google.com/maps/api/js\" ng-init=\"slMap.init()\">\n    <div class=\"adress-popup-left active\">\n        <h3 class=\"adress-popup-title\">Где забрать?</h3>\n        <div class=\"adress-popup-tabs\" ng-click=\"slMap.isMobile && (slMap.isMapActive = !slMap.isMapActive)\">\n            <a href=\"\" class=\"adress-tab adress-tab-list\" ng-class=\"{'active': !slMap.isMapActive}\">Список</a>\n            <a href=\"\" class=\"adress-tab adress-tab-map\" ng-class=\"{'active': slMap.isMapActive}\">НА КАРТЕ</a>\n        </div>\n        <div class=\"adress-popup-search\">\n            <input class=\"input adress-popup-input\" ng-class=\"{'active': slMap.outletsFilter.length}\"\n                   type=\"text\"\n                   ng-model=\"slMap.outletsFilter\"\n                   ng-change=\"slMap.resize()\">\n            <span class=\"adress-input-clear\" ng-show=\"slMap.outletsFilter\" ng-click=\"slMap.outletsFilter = ''\">&times;</span>\n        </div>\n        <div class=\"adress-popup-list\" ng-show=\"!slMap.isMobile || !slMap.isMapActive\">\n            <div ng-repeat=\"outlet in slMap.filtered | filter: slMap.outletsFilter | orderBy: ['remains.available', 'kind.sort']\"\n                 ng-class=\"{'active': outlet.selected, 'address-popup-list_remains': outlet.remains }\"\n                 ng-click=\"slMap.select(outlet)\"\n                 class=\"adress-popup-item\">\n                <div class=\"adress-popup-name\"><span ng-bind=\"::outlet.mall\">SUNLIGHT МЕГА Теплый Стан</span> <span ng-bind=\"::outlet.kind.name\">гипермаркет</span></div>\n                <div class=\"adress-popup-street\">\n                    <span ng-bind=\"::outlet.address\">Москва, улица Арбат, 12 с 1</span>\n                    <div class=\"adress-popup-time\" ng-bind=\"::outlet.opening_hours\">ПН-ВС 10:00-22:00</div>\n                </div>\n                <div class=\"adress-popup-metro\" ng-repeat=\"metro in ::outlet.metros\">\n                    <span ng-style=\"{color: '#' + metro.color}\" class=\"futuraIcon\">&#x00BD;</span>\n                    <span ng-bind=\"metro.name\">Электрозаводская</span>\n                </div>\n                <div class=\"adress-popup-info\" ng-if=\"::outlet.remains\">\n                    <span class=\"adress-popup-status adress-popup-status-green\" ng-if=\"::outlet.remains.available\">В наличии</span>\n                    <span class=\"adress-popup-status\" ng-if=\"::outlet.remains.pickup\">Под заказ</span>\n                    <span ng-if=\"::outlet.remains.available !== false\">Можно забрать <span ng-bind=\"::outlet.remains.pickup || 'сегодня'\"></span></span>\n                </div>\n                <span class=\"adress-item-arrow\"><img src=\"/bower_components/sl-map/src/images/all/adress-arrow-left.png\" alt=\"\"></span>\n            </div>\n            <div ng-show=\"slMap.otherRegion.length\" class=\"adress-popup-other-region\">В других регионах</div>\n            <div ng-repeat=\"outlet in slMap.otherRegion | filter: slMap.outletsFilter | orderBy: 'kind.sort'\"\n                 ng-class=\"{'active': outlet.selected, 'address-popup-list_remains': outlet.remains }\"\n                 ng-click=\"slMap.select(outlet)\"\n                 ng-show=\"slMap.otherRegion.length\"\n                 class=\"adress-popup-item\">\n                <div class=\"adress-popup-name\">\n                    <span ng-bind=\"::outlet.mall\">SUNLIGHT МЕГА Теплый Стан</span>\n                    <span ng-bind=\"::outlet.kind.name\">гипермаркет</span>\n                </div>\n                <div class=\"adress-popup-street\">\n                    <span ng-bind=\"::outlet.address\">Москва, улица Арбат, 12 с 1</span>\n                    <div class=\"adress-popup-time\" ng-bind=\"::outlet.opening_hours\">ПН-ВС 10:00-22:00</div>\n                </div>\n                <div class=\"adress-popup-metro\" ng-repeat=\"metro in ::outlet.metros\">\n                    <span ng-style=\"{color: '#' + metro.color}\" class=\"futuraIcon\">&#x00BD;</span>\n                    <span ng-bind=\"metro.name\">Электрозаводская</span>\n                </div>\n                <div class=\"adress-popup-info\" ng-if=\"outlet.remains\">\n                    <span class=\"adress-popup-status adress-popup-status-green\" ng-if=\"outlet.remains.hasOwnProperty('available')\">В наличии</span>\n                    <span class=\"adress-popup-status\" ng-if=\"outlet.remains.pickup\">Под заказ</span>\n                    <span ng-if=\"outlet.remains.available !== false\">Можно забрать <span ng-bind=\"::outlet.remains.pickup || 'сегодня'\"></span></span>\n                </div>\n                <span class=\"adress-item-arrow\"><img src=\"/bower_components/sl-map/src/images/all/adress-arrow-left.png\" alt=\"\"></span>\n            </div>\n            <div ng-show=\"slMap.emptyList\"\n                 class=\"adress-popup-empty-list ng-hide\">По вашему запросу ничего не найдено.</div>\n            <!--<div class=\"adress-popup-item adress-popup-item2 active\" data-mark=\"adress-mark2\" data-box=\"adress-box2\">\n                <div class=\"adress-popup-name\"><span>ТЦ РИО</span> СЕКция</div>\n                <div class=\"adress-popup-street\">\n                    Москва, Мажоритарный пр. 8\n                    <div class=\"adress-popup-time\">10:00-22:00</div>\n                </div>\n                <div class=\"adress-popup-metro\">Электрозаводская</div>\n                <div class=\"adress-popup-info\">\n                    <span class=\"adress-popup-status adress-popup-status-green\">В наличии</span>\n                    Можно забрать прямо сейчас\n                </div>\n                <span class=\"adress-item-arrow\"><img src=\"/bower_components/sl-map/src/images/all/adress-arrow-left.png\" alt=\"\"></span>\n            </div>\n            <div class=\"adress-popup-item adress-popup-item3\" data-mark=\"adress-mark3\" data-box=\"adress-box3\">\n                <div class=\"adress-popup-name\"><span>SUNLIGHT БОРОДИЩЕВО</span> МИНИмаркет</div>\n                <div class=\"adress-popup-street\">\n                    Загопниковская, д. 507 корпус 501, ТЦ ИЮНЬ\n                    <div class=\"adress-popup-time\">ПН-ВС 10:00-22:00, СБ-ВС 11:00-12:00</div>\n                </div>\n                <div class=\"adress-popup-metro\">Электрозаводская</div>\n                <div class=\"adress-popup-info\">\n                    <span class=\"adress-popup-status\">Под заказ</span>\n                    Можно забрать завтра\n                </div>\n                <span class=\"adress-item-arrow\"><img src=\"/bower_components/sl-map/src/images/all/adress-arrow-left.png\" alt=\"\"></span>\n            </div>-->\n        </div>\n    </div>\n    <div class=\"adress-popup-right\" ng-class=\"{'invisible': slMap.isMobile && !slMap.isMapActive}\">\n        <ng-map class=\"adress-popup-map\" pan-control=\"true\" pan-control-options=\"{position:'TOP_RIGHT'}\" map-type-control=\"false\" height=\"100%\"\n                zoom-control=\"true\" zoom-control-options=\"{style:'LARGE', position:'LEFT_TOP'}\" scale-control=\"true\" on-zoom_changed=\"slMap.proxify(event, 'resize')\"\n                on-bounds_changed=\"slMap.proxify(event, 'resize')\" single-info-window=\"true\" street-view-control=\"false\"\n                center=\"[55.755773, 37.614608]\">\n            <!--<img src=\"/bower_components/sl-map/src/images/all/popup-map.jpg\" alt=\"\" class=\"adress-popup-map-img\">-->\n            <a href=\"\" class=\"adress-mark adress-mark1\" data-item=\"adress-popup-item1\" data-box=\"adress-box1\"></a>\n            <a href=\"\" class=\"adress-mark adress-mark2 active\" data-item=\"adress-popup-item2\" data-box=\"adress-box2\"></a>\n            <a href=\"\" class=\"adress-mark adress-mark3\" data-item=\"adress-popup-item3\" data-box=\"adress-box3\"></a>\n            <marker ng-repeat=\"outlet in slMap.outlets | filter: slMap.outletsFilter\"\n                    id=\"outlet_{{::outlet.id}}\"\n                    position=\"{{::outlet.geo}}\"\n                    on-click=\"slMap.proxify('select', outlet)\"\n                    icon=\"{{outlet.icon || slMap.defaultIcon}}\">\n            </marker>\n        </ng-map>\n    </div>\n    <div class=\"adress-popup-box-holder\" ng-if=\"slMap.selected\">\n        <div class=\"adress-popup-box active\">\n            <a href=\"\" class=\"adress-box-back\" ng-show=\"slMap.isMobile\" ng-click=\"slMap.back()\" ><img src=\"/bower_components/sl-map/src/images/all/adress-arrow-right.png\" alt=\"\"></a>\n            <a href=\"\" class=\"adress-box-close\" ng-if=\"slMap.isMobile && !slMap.selected.remains\"\n               ng-click=\"slMap.back()\"><img src=\"/bower_components/sl-map/src/images/all/cross-grey.png\" alt=\"\"></a>\n            <div class=\"adress-popup-name\"><span ng-bind=\"slMap.selected.mall\">SUNLIGHT МЕГА Теплый Стан</span> <span ng-bind=\"slMap.selected.kind.name\">гипермаркет</span></div>\n            <div class=\"adress-popup-box-img\" ng-show=\"slMap.constructor.getPrimary(slMap.selected.images)\">\n                <img ng-src=\"{{slMap.constructor.getPrimary(slMap.selected.images).file}}\" alt=\"\">\n            </div>\n            <div class=\"adress-popup-box-text\">\n                <div class=\"adress-popup-street\" ng-bind=\"slMap.selected.address\">\n                    Москва, улица Арбат, 12 с 1\n                </div>\n                <div class=\"adress-popup-time\" ng-bind=\"slMap.selected.opening_hours\">ПН-ВС 10:00-22:00</div>\n                <div class=\"adress-popup-metro\" ng-repeat=\"metro in slMap.selected.metros\">\n                    <span ng-style=\"{color: '#' + metro.color}\" class=\"futuraIcon\">&#x00BD;</span>\n                    <span ng-bind=\"metro.name\">Электрозаводская</span>\n                </div>\n                <div class=\"adress-popup-info\">\n                    <span class=\"adress-popup-status\">Под заказ</span>\n                    Можно забрать 24 сентября\n                </div>\n                <a href=\"\" class=\"button\" ng-if=\"slMap.selected.remains\" ng-click=\"reserve.openReserveDialog(slMap.selected.remains)\">ЗАРЕЗЕРВИРОВАТЬ</a>\n            </div>\n        </div>\n        <!--<div class=\"adress-popup-box adress-box2 active\">\n            <a href=\"\" class=\"adress-box-back\"><img src=\"/bower_components/sl-map/src/images/all/adress-arrow-right.png\" alt=\"\"></a>\n            <a href=\"\" class=\"adress-box-close\"><img src=\"/bower_components/sl-map/src/images/all/cross-grey.png\" alt=\"\"></a>\n            <div class=\"adress-popup-name\"><span>ТЦ РИО</span> СЕКция</div>\n            <div class=\"adress-popup-box-img\">\n                <img src=\"/bower_components/sl-map/src/images/all/adress-img1.jpg\" alt=\"\">\n            </div>\n            <div class=\"adress-popup-box-text\">\n                <div class=\"adress-popup-street\">\n                    Москва, Мажоритарный пр. 8\n                    <div class=\"adress-popup-time\">10:00-22:00</div>\n                </div>\n                <div class=\"adress-popup-metro\">Электрозаводская</div>\n                <div class=\"adress-popup-info\">\n                    <span class=\"adress-popup-status adress-popup-status-green\">В наличии</span>\n                    Можно забрать прямо сейчас\n                </div>\n                <a href=\"\" class=\"button\">ЗАРЕЗЕРВИРОВАТЬ</a>\n            </div>\n        </div>\n        <div class=\"adress-popup-box adress-box3\">\n            <a href=\"\" class=\"adress-box-back\"><img src=\"/bower_components/sl-map/src/images/all/adress-arrow-right.png\" alt=\"\"></a>\n            <a href=\"\" class=\"adress-box-close\"><img src=\"/bower_components/sl-map/src/images/all/cross-grey.png\" alt=\"\"></a>\n            <div class=\"adress-popup-name\"><span>SUNLIGHT БОРОДИЩЕВО</span> МИНИмаркет</div>\n            <div class=\"adress-popup-box-img\">\n                <img src=\"/bower_components/sl-map/src/images/all/adress-img1.jpg\" alt=\"\">\n            </div>\n            <div class=\"adress-popup-box-text\">\n                <div class=\"adress-popup-street\">\n                    Загопниковская, д. 507 корпус 501, ТЦ ИЮНЬ\n                    <div class=\"adress-popup-time\">ПН-ВС 10:00-22:00, СБ-ВС 11:00-12:00</div>\n                </div>\n                <div class=\"adress-popup-metro\">Электрозаводская</div>\n                <div class=\"adress-popup-info\">\n                    <span class=\"adress-popup-status\">Под заказ</span>\n                    Можно забрать завтра\n                </div>\n                <a href=\"\" class=\"button\">ЗАРЕЗЕРВИРОВАТЬ</a>\n            </div>\n        </div>-->\n    </div>\n</div>\n";
	window.angular.module('ng').run(['$templateCache', function(c) { c.put(path, html) }]);
	module.exports = path;

/***/ }
/******/ ]);