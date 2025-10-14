export default {
  expo: {
    name: "TransFleet Rider",
    slug: "primecare-rider",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
      "**/*"
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.primecare.rider",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "This app needs access to location when open to provide navigation and track deliveries.",
        NSLocationAlwaysAndWhenInUseUsageDescription: "This app needs access to location to provide navigation and track deliveries.",
        NSCameraUsageDescription: "This app needs access to camera to scan QR codes and take package photos."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      package: "com.primecare.rider",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "RECORD_AUDIO"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow TransFleet Rider to use your location for navigation and delivery tracking."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow TransFleet Rider to access your camera to scan QR codes and take package photos."
        }
      ]
    ]
  }
};