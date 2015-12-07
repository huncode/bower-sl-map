const mapTpl = require('ngtemplate!html!./map.html');
class Map {
  constructor() {
    this.scope = true;
    this.bindToController = {
      outletsRemains: '@slMapFilter',
      selectedSize: '@slMapRemainsSize'
    };
    this.controller = MapController;
    this.controllerAs = 'slMap';
    this.templateUrl = mapTpl;
  }
}

class MapController {
  /**
   @ngInject
   */
  constructor(NgMap, Regions, Outlets, $timeout, $rootScope, $window, $q) {
    this.NgMap = NgMap;
    this.Regions = Regions;
    this.Outlets = Outlets;
    this.$timeout = $timeout;
    this.$window = $window;
    this.$q = $q;
    this.model = {};
    this.isMobile = /android|ip(hone|ad|od)/i.test($window.navigator.userAgent);
    this.selectedSize = this.selectedSize || 0;
    this.init();

    $rootScope.$on('mapShow', (event, outlet) => {
      $timeout(() => {
        this.select(outlet || {id: null});
        this.render();
      });
    });

    $rootScope.$on('region:change', (event, regionId) => {
      this.setRegion(regionId, true);
      this.model.location = Regions.current;
    });
  }

  init() {
    this.$q.all({
      regions: this.Regions.fetch(),
      outlets: this.Outlets.fetch(),
      map: this.NgMap.getMap()
    }).then((responses) => {
      this.regions = this.Regions.all;
      this.outlets = responses.outlets;
      this.map = responses.map;
      console.log(this.map);
      this.map.width = this.$window.outerWidth;
      this.map.height = this.$window.outerHeight;
      this.map._controller = this;
      this.model.location = this.Regions.current;
      this.outletsRemains = this.outletsRemains && angular.fromJson(this.outletsRemains);
      this.model.outlets = this.outletsRemains ?
        this.Outlets.byRegion(this.model.location.id).filter(this.filterRemains.bind(this)) :
        this.Outlets.byRegion(this.model.location.id);
      this.remains = this.outletsRemains.reduce((remains, remain) => {
        let outlet = this.model.outlets.filter((_outlet) => _outlet.id === remain.outlet_id)[0];
        if (!outlet || !remain.available && !remain.pickup) {
          return remains;
        }
        if (!remains[remain.size]) {
          remains[remain.size] = [];
        }
        outlet.remains = remain;
        remains[remain.size].push(outlet);

        return remains;
      }, {});

      this.render();
    });
  }

  pluckSize(size) {
    console.log(this.remains, size, this.selectedSize);
    return this.remains && (this.remains[size] || this.remains[this.selectedSize] || this.remains[0]);
  }

  setRegion(regionId, externalSet) {
    regionId = regionId || this.model.location.id;
    this.back();
    this.model.outlets = this.outletsRemains ?
      this.Outlets.byRegion(regionId).filter(this.filterRemains.bind(this)) :
      this.Outlets.byRegion(regionId);
    if (!externalSet) this.Regions.setRegion(regionId);
    this.render();
  }

  render() {
    this.bounds = this.gm('LatLngBounds');
    this.model.outlets.forEach((outlet) => {
      if (outlet.geo && outlet.geo.length) {
        const marker = this.gm('LatLng', outlet.geo[0], outlet.geo[1]);
        this.bounds.extend(marker);
      }
    });
    this.$window.google.maps.event.trigger(this.map, 'resize');

    if (this.selected) return;
    this.map.fitBounds(this.bounds);
    this.map.panToBounds(this.bounds);
    if (this.map.zoom > 15) this.map.setZoom(15);
  }

  select(outlet) {
    if (!outlet) return;
    this.model.outlets.forEach((_outlet) => {
      const equal = _outlet.id === outlet.id;
      if (equal) {
        _outlet.remains = outlet.remains;
      }
      _outlet.selected = (_outlet.id === outlet.id);
    });

    if (this.selected || this.map.zoom < 15) this.map.setZoom(15);
    this.openInfo(null, outlet);
    this.map.setCenter(this.gm('LatLng', outlet.geo[0], outlet.geo[1]));
  }

  back() {
    if (this.selected) {
      this.selected.icon = '';
      this.selected.selected = false;
      this.selected.remains = null;
      this.selected = null;
    }
    this.map.hideInfoWindow('info');
  }

  filterRemains(outlet) {
    return this.outletsRemains.filter((_remain) => _remain.outlet_id === outlet.id).length;
  }

  openInfo(event, outlet) {
    const id = outlet.id;
    const ctrl = event ? this.map._controller : this;

    ctrl.selected = outlet;
    ctrl.selected.icon = 'http://cdn1.love.sl/love.sl/common/actions/charm/assets/marker_active.png';

    this.map.showInfoWindow('info', `outlet_${id}`);
    if (event !== null) {
      ctrl.select.call(ctrl, outlet);
      ctrl.$timeout(() => ctrl.scroll.call(ctrl));
    }

    if (!this.map.singleInfoWindow) return;

    if (this.map.lastInfoWindow && this.map.lastInfoWindow !== outlet) {
      this.map.hideInfoWindow('info');
      this.map.lastInfoWindow.icon = '';
    }

    this.map.lastInfoWindow = outlet;
  }

  scroll() {
    let list = document.querySelector('.outlets--wrapper'); //eslint-disable-line angular/document-service
    let selected = list.querySelector('.outlet-selected');
    angular.element(list).animate({
      scrollTop: selected.offsetTop - selected.offsetHeight
    });
    angular.element(document).scrollTop(window.pageYOffset + list.parentNode.getBoundingClientRect().top);  //eslint-disable-line angular/document-service,angular/window-service
  }

  gm(googleMapsMethod) {
    let args = [null].concat(Array.prototype.slice.call(arguments, 1));
    return new (Function.prototype.bind.apply(this.$window.google.maps[googleMapsMethod], args));
  }

  showcase(refresh) {
    if (refresh) {
      this._showcase = refresh;
      this.$timeout(() => {
        this.render();
        this.select();
      });
    }

    return this._showcase || 'list';
  }
}

export default Map;
