import React, { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';

let NativeMapView, NativeMarker, NativeCircle, NativeCallout;
let ReactMapGL, MapLibreMarker;

if (Platform.OS === 'web') {
  // Web map using react-map-gl with MapLibre
  const MapGL = require('react-map-gl/dist/maplibre');
  ReactMapGL = MapGL.Map;
  MapLibreMarker = MapGL.Marker;
} else {
  // Native map using react-native-maps
  const MapModule = require('react-native-maps');
  NativeMapView = MapModule.default;
  NativeMarker = MapModule.Marker;
  NativeCircle = MapModule.Circle;
  NativeCallout = MapModule.Callout;
}

export const UnifiedMapView = ({ style, region, onRegionChange, onPress, children, ...props }) => {
  const mapRef = useRef(null);

  if (Platform.OS === 'web') {
    const viewState = region ? {
      longitude: region.longitude,
      latitude: region.latitude,
      zoom: 14,
    } : {
      longitude: -122.4,
      latitude: 37.8,
      zoom: 10,
    };

    return (
      <View style={[styles.container, style]}>
        <ReactMapGL
          ref={mapRef}
          initialViewState={viewState}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
          onMove={(evt) => {
            if (onRegionChange) {
              onRegionChange({
                latitude: evt.viewState.latitude,
                longitude: evt.viewState.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              });
            }
          }}
          onClick={(evt) => {
            if (onPress) {
              onPress({
                nativeEvent: {
                  coordinate: {
                    latitude: evt.lngLat.lat,
                    longitude: evt.lngLat.lng,
                  },
                },
              });
            }
          }}
          {...props}
        >
          {children}
        </ReactMapGL>
      </View>
    );
  }

  return (
    <NativeMapView
      ref={mapRef}
      style={[styles.container, style]}
      region={region}
      onRegionChange={onRegionChange}
      onPress={onPress}
      {...props}
    >
      {children}
    </NativeMapView>
  );
};

export const UnifiedMarker = ({ coordinate, title, description, children, pinColor, ...props }) => {
  if (Platform.OS === 'web') {
    return (
      <MapLibreMarker
        longitude={coordinate.longitude}
        latitude={coordinate.latitude}
        anchor="bottom"
        {...props}
      >
        <View style={styles.webMarker}>
          <View style={[styles.webPin, pinColor && { backgroundColor: pinColor }]} />
        </View>
      </MapLibreMarker>
    );
  }

  return (
    <NativeMarker
      coordinate={coordinate}
      title={title}
      description={description}
      pinColor={pinColor}
      {...props}
    >
      {children}
    </NativeMarker>
  );
};

export const UnifiedCircle = ({ center, radius, fillColor, strokeColor, strokeWidth, ...props }) => {
  if (Platform.OS === 'web') {
    // For web, we'll create a simple circle overlay using SVG or HTML
    // This is a simplified version - you could enhance with actual circle rendering
    return null; // Circles are less critical for web, can be added later
  }

  return (
    <NativeCircle
      center={center}
      radius={radius}
      fillColor={fillColor}
      strokeColor={strokeColor}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
};

export const UnifiedCallout = ({ children, ...props }) => {
  if (Platform.OS === 'web') {
    // Callouts are handled by MapLibre's built-in popup system
    return null;
  }

  return <NativeCallout {...props}>{children}</NativeCallout>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webMarker: {
    cursor: 'pointer',
  },
  webPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF0000',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
