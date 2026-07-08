import React, { useRef, useState } from 'react'
import { StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native'
import MapView, { Polyline, Marker, Region, MapPressEvent } from 'react-native-maps'
import { REGIONS } from '../../constants/regions'
import { useOSMData } from '../../hooks/useOSMData'
import { useFeatures } from '../../hooks/useFeatures'
import { useDeviceId } from '../../hooks/useDeviceId'
import { useVotes } from '../../hooks/useVotes'
import { isWay, isNode, isBikeParking, isBikeRepair, wayToLatLngs } from '../../osm/cycling'
import { snapToNearestWay, SnapResult } from '../../osm/snap'
import { FEATURE_TYPE_META } from '../../constants/featureTypes'
import { ConditionStatus, FeatureType, MapFeature } from '../../types/feature'
import { SyncStatusBar } from '../sync/SyncStatusBar'
import { ReportSheet } from './ReportSheet'
import { FeatureDetailSheet } from './FeatureDetailSheet'

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
  const { features, addFeature, removeFeature } = useFeatures()
  const deviceId = useDeviceId()

  const [reporting, setReporting] = useState(false)
  const [pendingLocation, setPendingLocation] = useState<SnapResult | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<MapFeature | null>(null)
  const votes = useVotes(selectedFeature?.id, deviceId)

  const ways = elements.filter(isWay)
  const parkingNodes = elements.filter(isBikeParking)
  const repairNodes = elements.filter(isBikeRepair)

  const handleMapPress = (event: MapPressEvent) => {
    if (!reporting) return
    setReporting(false)
    setPendingLocation(snapToNearestWay(event.nativeEvent.coordinate, ways))
  }

  const handleReportSubmit = (data: { type: FeatureType; status: ConditionStatus; title: string; description?: string }) => {
    if (!pendingLocation || !deviceId) return
    const expiryMs = FEATURE_TYPE_META[data.type].defaultExpiryMs
    addFeature({
      type: data.type,
      status: data.status,
      coordinates: {
        lat: pendingLocation.lat,
        lng: pendingLocation.lng,
        snappedToOSM: pendingLocation.snappedToOSM,
      },
      title: data.title,
      description: data.description,
      reportedBy: deviceId,
      region: 'hamilton',
      osmWayId: pendingLocation.osmWayId,
      expiresAt: expiryMs ? new Date(Date.now() + expiryMs).toISOString() : undefined,
    })
    setPendingLocation(null)
  }

  const handleRemove = () => {
    if (!selectedFeature) return
    removeFeature(selectedFeature.id)
    setSelectedFeature(null)
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
        onPress={handleMapPress}
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

        {features.map(feature => (
          <Marker
            key={feature.id}
            coordinate={{ latitude: feature.coordinates.lat, longitude: feature.coordinates.lng }}
            pinColor={FEATURE_TYPE_META[feature.type].color}
            onPress={() => setSelectedFeature(feature)}
          />
        ))}
      </MapView>

      <SyncStatusBar />

      {reporting && (
        <View style={styles.reportingBanner}>
          <Text style={styles.reportingBannerText}>Tap the map to place your report</Text>
          <Pressable onPress={() => setReporting(false)}>
            <Text style={styles.reportingBannerCancel}>Cancel</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        style={[styles.fab, reporting && styles.fabActive]}
        onPress={() => setReporting(r => !r)}
        disabled={!deviceId}
      >
        <Text style={styles.fabText}>{reporting ? '×' : '+'}</Text>
      </Pressable>

      <ReportSheet
        location={pendingLocation}
        onCancel={() => setPendingLocation(null)}
        onSubmit={handleReportSubmit}
      />

      <FeatureDetailSheet
        feature={selectedFeature}
        isOwner={selectedFeature?.reportedBy === deviceId}
        confirmations={votes.confirmations}
        flags={votes.flags}
        myVote={votes.myVote}
        onClose={() => setSelectedFeature(null)}
        onConfirm={() => votes.castVote('confirm')}
        onFlag={() => votes.castVote('flag')}
        onRemove={handleRemove}
      />

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
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E86AB',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabActive: { backgroundColor: '#E63946' },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 30 },
  reportingBanner: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportingBannerText: { color: '#fff', fontSize: 13, flexShrink: 1 },
  reportingBannerCancel: { color: '#F4A261', fontSize: 13, fontWeight: '700', marginLeft: 12 },
})
