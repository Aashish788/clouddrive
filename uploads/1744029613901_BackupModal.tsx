import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaskedView from '@react-native-masked-view/masked-view';

interface BackupModalProps {
  visible: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export default function BackupModal({ visible, onClose, isDark }: BackupModalProps) {
  // Animation values for complex animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statusIndicatorAnim = useRef(new Animated.Value(0)).current;
  const statusPulseAnim = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim1 = useRef(new Animated.Value(1)).current;
  const buttonScaleAnim2 = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressRotateAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  
  // State for backup status
  const [isConnected, setIsConnected] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backupStats, setBackupStats] = useState({ 
    files: 0, 
    size: '0 MB' 
  });
  
  // Handle pulse animation for status indicator
  useEffect(() => {
    if (isConnected) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(statusPulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true
          }),
          Animated.timing(statusPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      statusPulseAnim.setValue(1);
    }
    
    return () => {
      statusPulseAnim.stopAnimation();
    };
  }, [isConnected]);
  
  // Handle progress animation for backup/restore
  useEffect(() => {
    if (backupInProgress || restoreInProgress) {
      Animated.loop(
        Animated.timing(progressRotateAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true
        })
      ).start();
      
      // Simulate progress updates
      const interval = setInterval(() => {
        setBackupProgress(prev => {
          const next = prev + Math.random() * 20;
          return next > 95 ? 95 : next;
        });
      }, 500);
      
      return () => {
        clearInterval(interval);
        progressRotateAnim.stopAnimation();
      };
    } else {
      setBackupProgress(0);
    }
  }, [backupInProgress, restoreInProgress]);
  
  // Update progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: backupProgress / 100,
      duration: 300,
      useNativeDriver: false
    }).start();
  }, [backupProgress]);
  
  // Load saved backup data when modal becomes visible
  useEffect(() => {
    if (visible) {
      loadBackupData();
      animateEntrance();
    }
  }, [visible]);
  
  // Load previously saved backup data
  const loadBackupData = async () => {
    try {
      setIsLoading(true);
      
      // Get connection status
      const connectionStatus = await AsyncStorage.getItem('@backup_connected');
      setIsConnected(connectionStatus === 'true');
      
      // Get last backup time
      const lastBackup = await AsyncStorage.getItem('@last_backup_time');
      setLastBackupTime(lastBackup);
      
      // Simulate fetching backup stats
      setTimeout(() => {
        setBackupStats({
          files: 43,
          size: '8.2 MB'
        });
        setIsLoading(false);
        
        // Animate status indicator after loading completes
        Animated.spring(statusIndicatorAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true
        }).start();
      }, 600);
    } catch (error) {
      console.error('Error loading backup data:', error);
      setIsLoading(false);
    }
  };
  
  // Complex entrance animations sequence
  const animateEntrance = () => {
    // Reset animations
    statusIndicatorAnim.setValue(0);
    
    // Main modal animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
  };
  
  // Handle opening and closing animations
  useEffect(() => {
    if (!visible) {
      // Exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 30,
          duration: 250,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const handleBackupToGoogleDrive = async () => {
    if (backupInProgress || restoreInProgress) return;
    
    // Provide haptic feedback for button press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim1, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.spring(buttonScaleAnim1, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true
      })
    ]).start();
    
    setBackupInProgress(true);
    
    // Simulate backup process with update notifications
    setTimeout(async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      try {
        const now = new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        await AsyncStorage.setItem('@last_backup_time', now);
        await AsyncStorage.setItem('@backup_connected', 'true');
        setLastBackupTime(now);
        setIsConnected(true);
        setBackupProgress(100);
        
        // Short delay before completing to show 100%
        setTimeout(() => {
          setBackupInProgress(false);
        }, 500);
      } catch (error) {
        console.error('Error during backup:', error);
        setBackupInProgress(false);
      }
    }, 3000);
  };

  const handleBackupFromGoogleDrive = async () => {
    if (backupInProgress || restoreInProgress) return;
    
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScaleAnim2, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.spring(buttonScaleAnim2, {
        toValue: 1,
        friction: 4,
        tension: 80,
        useNativeDriver: true
      })
    ]).start();
    
    setRestoreInProgress(true);
    
    // Simulate restore process
    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRestoreInProgress(false);
    }, 4000);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return dateString;
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <BlurView 
        intensity={90} 
        tint={isDark ? "dark" : "light"}
        style={styles.blurContainer}
      >
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim }
              ],
              marginTop: insets.top,
              marginBottom: insets.bottom,
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF'
            }
          ]}
        >
          {/* Premium Header with Gradient Text */}
          <View style={styles.headerContainer}>
            <MaskedView
              maskElement={
                <Text style={[styles.title, { color: 'white' }]}>
                  Cloud Sync
                </Text>
              }
            >
              <LinearGradient
                colors={['#7CDB8A', '#58C5C6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, height: 40, justifyContent: 'center' }}
              >
                <Text style={[styles.title, { opacity: 0 }]}>
                  Cloud Sync
                </Text>
              </LinearGradient>
            </MaskedView>
            
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} 
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Ionicons name="close" size={22} color={isDark ? '#FFFFFF' : '#000000'} />
            </TouchableOpacity>
          </View>
          
          {/* Elegant Status Display with Animation */}
          <View style={[
            styles.statusDisplay, 
            { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
            }
          ]}>
            <Animated.View 
              style={[
                styles.statusIconWrapper,
                {
                  transform: [
                    { scale: statusIndicatorAnim },
                    { rotate: statusIndicatorAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-45deg', '0deg']
                    })}
                  ]
                }
              ]}
            >
              <Animated.View style={{
                transform: [{ scale: isConnected ? statusPulseAnim : 1 }]
              }}>
                <LinearGradient
                  colors={isConnected ? 
                    ['rgba(124, 219, 138, 1)', 'rgba(88, 197, 198, 1)'] : 
                    ['rgba(255, 107, 107, 0.8)', 'rgba(255, 107, 107, 0.6)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.statusIcon}
                >
                  <Ionicons 
                    name={isConnected ? "cloud-done" : "cloud-offline"} 
                    size={28} 
                    color="#FFFFFF" 
                  />
                </LinearGradient>
              </Animated.View>
            </Animated.View>
            
            <Text style={[styles.statusTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {isConnected ? "Connected to Google Drive" : "Not Connected"}
            </Text>
            
            {!isLoading ? (
              <View style={styles.statusInfoContainer}>
                <View style={styles.statusInfoItem}>
                  <Text style={[styles.statusInfoLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
                    Last backup
                  </Text>
                  <Text style={[styles.statusInfoValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {formatDate(lastBackupTime)}
                  </Text>
                </View>
                <View style={styles.statusInfoDivider} />
                <View style={styles.statusInfoItem}>
                  <Text style={[styles.statusInfoLabel, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }]}>
                    Backup size
                  </Text>
                  <Text style={[styles.statusInfoValue, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    {backupStats.size}
                  </Text>
                </View>
              </View>
            ) : (
              <ActivityIndicator size="small" color="#7CDB8A" style={{marginTop: 15}} />
            )}
          </View>
          
          {/* Backup Progress Bar - Only shown during operations */}
          {(backupInProgress || restoreInProgress) && (
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {backupInProgress ? 'Backing up' : 'Restoring'}: {Math.round(backupProgress)}%
              </Text>
            </View>
          )}
          
          {/* Action Buttons - Premium Style */}
          <View style={styles.buttonContainer}>
            {/* Backup to Google Drive Button */}
            <Animated.View style={{
              transform: [{ scale: buttonScaleAnim1 }],
              opacity: restoreInProgress ? 0.5 : 1
            }}>
              <TouchableOpacity 
                style={[styles.buttonWrapper]}
                onPress={handleBackupToGoogleDrive}
                activeOpacity={0.95}
                disabled={backupInProgress || restoreInProgress}
              >
                <LinearGradient
                  colors={['#7CDB8A', '#58C5C6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {backupInProgress ? (
                    <View style={styles.buttonLoadingContainer}>
                      <Animated.View style={{
                        transform: [{
                          rotate: progressRotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg']
                          })
                        }]
                      }}>
                        <MaterialCommunityIcons name="loading" size={22} color="#FFFFFF" />
                      </Animated.View>
                      <Text style={styles.buttonLoadingText}>Backing up...</Text>
                    </View>
                  ) : (
                    <>
                      <View style={styles.buttonIconContainer}>
                        <LinearGradient
                          colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
                          style={styles.iconGradient}
                        >
                          <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                        </LinearGradient>
                      </View>
                      <View style={styles.buttonTextContainer}>
                        <Text style={styles.buttonTitle}>Backup to Drive</Text>
                        <Text style={styles.buttonSubtext}>Save {backupStats.files} files • {backupStats.size}</Text>
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            
            {/* Restore from Google Drive Button */}
            <Animated.View style={{
              transform: [{ scale: buttonScaleAnim2 }],
              opacity: backupInProgress ? 0.5 : 1,
              marginTop: 12
            }}>
              <TouchableOpacity 
                style={[styles.buttonWrapper]}
                onPress={handleBackupFromGoogleDrive}
                activeOpacity={0.95}
                disabled={backupInProgress || restoreInProgress}
              >
                <View style={[
                  styles.outlineButton,
                  { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }
                ]}>
                  {restoreInProgress ? (
                    <View style={styles.buttonLoadingContainer}>
                      <Animated.View style={{
                        transform: [{
                          rotate: progressRotateAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg']
                          })
                        }]
                      }}>
                        <MaterialCommunityIcons name="loading" size={22} color={isDark ? '#FFFFFF' : '#000000'} />
                      </Animated.View>
                      <Text style={[
                        styles.buttonLoadingText, 
                        { color: isDark ? '#FFFFFF' : '#000000' }
                      ]}>Restoring...</Text>
                    </View>
                  ) : (
                    <>
                      <View style={[
                        styles.buttonIconContainer, 
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }
                      ]}>
                        <Ionicons 
                          name="cloud-download-outline" 
                          size={20} 
                          color={isDark ? '#58C5C6' : '#58C5C6'} 
                        />
                      </View>
                      <View style={styles.buttonTextContainer}>
                        <Text style={[
                          styles.buttonTitle, 
                          { color: isDark ? '#FFFFFF' : '#000000' }
                        ]}>Restore from Drive</Text>
                        <Text style={[
                          styles.buttonSubtext,
                          { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }
                        ]}>
                          {isConnected ? 'Download last backup' : 'Connect to Google Drive first'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>
          
          <View style={styles.securityNoteContainer}>
            <LinearGradient
              colors={isDark ? 
                ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] : 
                ['rgba(0,0,0,0.03)', 'rgba(0,0,0,0.02)']}
              style={styles.securityNote}
            >
              <Ionicons 
                name="shield-checkmark-outline" 
                size={18} 
                color={isDark ? '#7CDB8A' : '#58C5C6'} 
              />
              <Text style={[
                styles.securityText, 
                { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }
              ]}>
                End-to-end encrypted and accessible only by you
              </Text>
            </LinearGradient>
          </View>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 380,
    borderRadius: 26,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDisplay: {
    alignItems: 'center',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
  },
  statusIconWrapper: {
    marginBottom: 16,
  },
  statusIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusInfoContainer: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  statusInfoItem: {
    alignItems: 'center',
  },
  statusInfoLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  statusInfoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusInfoDivider: {
    height: 30,
    width: 1,
    backgroundColor: 'rgba(150,150,150,0.2)',
  },
  progressContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(150,150,150,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7CDB8A',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#7CDB8A',
    fontWeight: '500',
  },
  buttonContainer: {
    marginBottom: 24,
  },
  buttonWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  buttonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTextContainer: {
    flex: 1,
  },
  buttonTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  buttonLoadingText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  securityNoteContainer: {
    alignItems: 'center',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 16,
    width: '100%',
  },
  securityText: {
    fontSize: 13,
    marginLeft: 8,
  }
});
