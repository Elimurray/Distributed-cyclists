import React, { useRef } from 'react'
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native'
import MapView, { Polyline, Marker, Region } from 'react-native-maps'
import { REGIONS } from '../../constants/regions'
import { useOSMData } from '../../hooks/useOSMData'
import { isWay, isNode, isBikeParking, isBikeRepair, wayToLatLngs } from '../../osm/cycling'

const HAMILTON = REGIONS.hamilton
const CYCLEWAY_COLOUR = '#2E86AB'
const PARKING_COLOUR = '#2A9D8F'
const REPAIR_COLOUR = '#E9C46A'

const INITIAL_REGION: Region = {
  latitude: HAMILTON.center.lat,
  longitude: HAMILTON.center.lng,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
}

export function CyclingMap() {
  const mapRef = useRef<MapView>(null)
  const { elements, loading, error } = useOSMData(HAMILTON.bounds)

  const ways = elements.filter(isWay)
  const parkingNodes = elements.filter(isBikeParking)
  const repairNodes = elements.filter(isBikeRepair)

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        {ways.map(way => {
          const coords = wayToLatLngs(way)
          if (coords.length < 2) return null
          return (
            <Polyline
              key={way.id}
              coordinates={coords}
              strokeColor={CYCLEWAY_COLOUR}
              strokeWidth={3}
            />
          )
        })}

        {parkingNodes.map(node => (
          <Marker
            key={node.id}
            coordinate={{ latitude: node.lat, longitude: node.lon }}
            pinColor={PARKING_COLOUR}
            title="Bike Parking"
          />
        ))}

        {repairNodes.map(node => (
          <Marker
            key={node.id}
            coordinate={{ latitude: node.lat, longitude: node.lon }}
            pinColor={REPAIR_COLOUR}
            title="Bike Repair"
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={CYCLEWAY_COLOUR} />
          <Text style={styles.overlayText}>Loading cycling data...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>OSM load failed: {error}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  overlayText: { marginTop: 8, fontSize: 14, color: '#333' },
  errorBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#E63946',
    padding: 8,
  },
  errorText: { color: '#fff', textAlign: 'center', fontSize: 12 },
})
