/**
 * account-type.tsx
 *
 * Dwaso account-role selection screen.
 *
 * IMPORTANT:
 * - Existing navigation/API logic (buyer/seller) has NOT been changed.
 * - Buyer -> /signup
 * - Seller -> /signup with intent=seller
 * - Back button removed per request.
 * - Added "Already have an account? Log in" link -> router.push('/login')
 *   (update the route below if your login screen path differs).
 *
 * UI redesigned to match the provided Dwaso design:
 * - Full-screen marketplace background
 * - Dark transparent overlay
 * - Glass-style buyer/seller cards
 * - Compact cards (reduced height so screen fits without scrolling)
 * - Dwaso branding
 * - Orange/green accents
 * - Responsive layout
 */

import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ImageBackground,
  StatusBar,
  ScrollView,
  Dimensions,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────────────────────

const ORANGE = '#FF9F00';
const GREEN = '#8FE3B0';

const WHITE = '#FFFFFF';

const TEXT_WHITE = '#FFFFFF';
const TEXT_MUTED = 'rgba(255,255,255,0.70)';

const GLASS = 'rgba(9, 36, 27, 0.60)';
const GLASS_LIGHT = 'rgba(255,255,255,0.08)';
const GLASS_BORDER = 'rgba(255,255,255,0.13)';

const GREEN_GLASS = 'rgba(25, 72, 52, 0.65)';
const ORANGE_GLASS = 'rgba(105, 69, 16, 0.55)';

export default function AccountTypeScreen() {
  const [selected, setSelected] = useState<'buyer' | 'seller' | null>(null);

  // ───────────────────────────────────────────────────────────
  // EXISTING NAVIGATION LOGIC
  // DO NOT CHANGE
  // ───────────────────────────────────────────────────────────

  const handleContinue = () => {
    if (!selected) return;

    if (selected === 'buyer') {
      router.push('/signup');
    } else {
      router.push('/seller-registration');
    }
  };

  // ───────────────────────────────────────────────────────────
  // BACKGROUND IMAGE
  // Change this path ONLY if your image is somewhere else.
  // ───────────────────────────────────────────────────────────

  const backgroundImage = require('../../assets/images/customer.png');

  return (
    <View style={styles.root}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        resizeMode="cover"
      >
        {/* ────────────────────────────────────────────────
            DARK IMAGE OVERLAY
            Creates the dark cinematic look from the design.
        ──────────────────────────────────────────────── */}

        <View style={styles.darkOverlay} />

        {/* Extra left-side darkness so text remains readable */}
        <View style={styles.leftOverlay} />

        {/* Bottom green tint */}
        <View style={styles.bottomGreenOverlay} />

        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* ────────────────────────────────────────────
                HEADER
            ──────────────────────────────────────────── */}

            <View style={styles.headerRow}>
              {/* Dwaso logo */}
              <View style={styles.brandContainer}>
                <View style={styles.logoBox}>
                  <View style={styles.logoInner}>
                    <View style={styles.logoDot} />
                  </View>
                </View>

                <Text style={styles.brandName}>Dwaso</Text>
              </View>
            </View>

            {/* ────────────────────────────────────────────
                HERO SECTION
            ──────────────────────────────────────────── */}

            <View style={styles.heroSection}>
              <Text style={styles.title}>
                How will you{'\n'}
                use <Text style={styles.titleOrange}>Dwaso</Text>?
              </Text>

              <Text style={styles.subtitle}>
                Choose your account type so we can{'\n'}
                set things up correctly for you.
              </Text>
            </View>

            {/* ────────────────────────────────────────────
                ACCOUNT OPTIONS
            ──────────────────────────────────────────── */}

            <View style={styles.optionsContainer}>

              {/* ═══════════════════════════════════════════
                  BUYER
              ═══════════════════════════════════════════ */}

              <TouchableOpacity
                style={[
                  styles.accountCard,
                  selected === 'buyer' && styles.accountCardBuyerSelected,
                ]}
                onPress={() => setSelected('buyer')}
                activeOpacity={0.9}
              >
                {/* Card icon */}
                <View
                  style={[
                    styles.accountIcon,
                    styles.buyerIcon,
                    selected === 'buyer' && styles.buyerIconSelected,
                  ]}
                >
                  <Ionicons
                    name="bag-handle-outline"
                    size={26}
                    color={GREEN}
                  />
                </View>

                {/* Card content */}
                <View style={styles.accountContent}>

                  <View style={styles.accountTitleRow}>
                    <Text style={styles.accountTitle}>
                      I'm a{' '}
                      <Text style={styles.buyerTitleColor}>
                        Buyer
                      </Text>
                    </Text>

                    {/* Arrow */}
                    <View
                      style={[
                        styles.arrowCircle,
                        selected === 'buyer' &&
                          styles.arrowCircleBuyerSelected,
                      ]}
                    >
                      <Ionicons
                        name={
                          selected === 'buyer'
                            ? 'checkmark'
                            : 'chevron-forward'
                        }
                        size={16}
                        color={
                          selected === 'buyer'
                            ? GREEN
                            : WHITE
                        }
                      />
                    </View>
                  </View>

                  <Text style={styles.accountDescription}>
                    Post what you need and let nearby sellers bring it to you.
                  </Text>

                  {/* Feature tags */}
                  <View style={styles.tagRow}>
                    <View style={styles.buyerTag}>
                      <Text style={styles.buyerTagText}>
                        Post requests
                      </Text>
                    </View>

                    <View style={styles.buyerTag}>
                      <Text style={styles.buyerTagText}>
                        Browse items
                      </Text>
                    </View>

                    <View style={styles.buyerTag}>
                      <Text style={styles.buyerTagText}>
                        Compare offers
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>

              {/* ═══════════════════════════════════════════
                  SELLER
              ═══════════════════════════════════════════ */}

              <TouchableOpacity
                style={[
                  styles.accountCard,
                  styles.sellerCard,
                  selected === 'seller' &&
                    styles.accountCardSellerSelected,
                ]}
                onPress={() => setSelected('seller')}
                activeOpacity={0.9}
              >
                {/* Card icon */}
                <View
                  style={[
                    styles.accountIcon,
                    styles.sellerIcon,
                    selected === 'seller' &&
                      styles.sellerIconSelected,
                  ]}
                >
                  <Ionicons
                    name="storefront-outline"
                    size={26}
                    color={ORANGE}
                  />
                </View>

                {/* Card content */}
                <View style={styles.accountContent}>

                  <View style={styles.accountTitleRow}>
                    <Text style={styles.accountTitle}>
                      I'm a{' '}
                      <Text style={styles.sellerTitleColor}>
                        Seller
                      </Text>
                    </Text>

                    {/* Arrow */}
                    <View
                      style={[
                        styles.arrowCircle,
                        selected === 'seller' &&
                          styles.arrowCircleSellerSelected,
                      ]}
                    >
                      <Ionicons
                        name={
                          selected === 'seller'
                            ? 'checkmark'
                            : 'chevron-forward'
                        }
                        size={16}
                        color={
                          selected === 'seller'
                            ? ORANGE
                            : WHITE
                        }
                      />
                    </View>
                  </View>

                  <Text style={styles.accountDescription}>
                    Receive requests from buyers in your area and grow your business.
                  </Text>

                  {/* Feature tags */}
                  <View style={styles.tagRow}>
                    <View style={styles.sellerTag}>
                      <Text style={styles.sellerTagText}>
                        Get buyer requests
                      </Text>
                    </View>

                    <View style={styles.sellerTag}>
                      <Text style={styles.sellerTagText}>
                        Sell products
                      </Text>
                    </View>

                    <View style={styles.sellerTag}>
                      <Text style={styles.sellerTagText}>
                        Offer services
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* ────────────────────────────────────────────
                BOTTOM INFORMATION
            ──────────────────────────────────────────── */}

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={GREEN}
                />
              </View>

              <Text style={styles.infoText}>
                You can always switch or add a seller profile later.
              </Text>
            </View>

            {/* ────────────────────────────────────────────
                CONTINUE BUTTON
            ──────────────────────────────────────────── */}

            <TouchableOpacity
              style={[
                styles.continueButton,
                !selected && styles.continueButtonDisabled,
              ]}
              onPress={handleContinue}
              disabled={!selected}
              activeOpacity={0.88}
            >
              <Text style={styles.continueText}>
                Continue
              </Text>

              <View style={styles.continueArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={19}
                  color={WHITE}
                />
              </View>
            </TouchableOpacity>

            {/* ────────────────────────────────────────────
                LOGIN LINK
                For users who already have an account.
            ──────────────────────────────────────────── */}

            <TouchableOpacity
              style={styles.loginRow}
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
              hitSlop={8}
            >
              <Text style={styles.loginText}>
                Already have an account?{' '}
                <Text style={styles.loginTextBold}>Log in</Text>
              </Text>
            </TouchableOpacity>

            {/* Bottom spacing */}
            <View style={styles.bottomSpace} />

          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const styles = StyleSheet.create({

  // ─────────────────────────────────────────────────────────────
  // ROOT
  // ─────────────────────────────────────────────────────────────

  root: {
    flex: 1,
    backgroundColor: '#071C15',
  },

  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  safeArea: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
    justifyContent: 'space-between',
  },

  // ─────────────────────────────────────────────────────────────
  // IMAGE OVERLAYS
  // ─────────────────────────────────────────────────────────────

  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    // Main dark transparent layer
    backgroundColor: 'rgba(3, 20, 15, 0.52)',
  },

  leftOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '72%',
    bottom: 0,

    // Makes the left side darker
    // so the title remains readable.
    backgroundColor: 'rgba(2, 19, 14, 0.18)',
  },

  bottomGreenOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '30%',

    backgroundColor: 'rgba(9, 68, 40, 0.20)',
  },

  // ─────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────

  headerRow: {
    width: '100%',
    height: 46,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',

    marginBottom: 12,
  },

  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',

    marginLeft: -8,
  },

  logoBox: {
    width: 38,
    height: 38,

    borderRadius: 11,

    backgroundColor: ORANGE,

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.20,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  logoInner: {
    width: 19,
    height: 19,

    borderRadius: 6,

    borderWidth: 3.5,
    borderColor: WHITE,

    alignItems: 'center',
    justifyContent: 'center',
  },

  logoDot: {
    width: 4,
    height: 4,

    borderRadius: 2,

    backgroundColor: WHITE,
  },

  brandName: {
    color: WHITE,

    fontSize: 22,
    fontWeight: '800',

    marginLeft: 10,

    letterSpacing: -0.5,
  },

  // ─────────────────────────────────────────────────────────────
  // HERO
  // ─────────────────────────────────────────────────────────────

  heroSection: {
    marginTop: 10,
    marginBottom: 16,
  },

  title: {
    color: TEXT_WHITE,

    fontSize: 28,
    lineHeight: 33,

    fontWeight: '900',

    letterSpacing: -0.8,
  },

  titleOrange: {
    color: ORANGE,
  },

  subtitle: {
    color: TEXT_MUTED,

    fontSize: 14,
    lineHeight: 20,

    fontWeight: '500',

    marginTop: 8,
  },

  // ─────────────────────────────────────────────────────────────
  // ACCOUNT OPTIONS
  // ─────────────────────────────────────────────────────────────

  optionsContainer: {
    width: '100%',

    gap: 12,
  },

  accountCard: {
    width: '100%',

    flexDirection: 'row',

    alignItems: 'flex-start',

    paddingVertical: 14,
    paddingHorizontal: 16,

    borderRadius: 18,

    backgroundColor: GLASS,

    borderWidth: 1,
    borderColor: GLASS_BORDER,

    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 5,
  },

  sellerCard: {
    backgroundColor: 'rgba(8, 38, 28, 0.66)',
  },

  accountCardBuyerSelected: {
    backgroundColor: 'rgba(21, 70, 48, 0.76)',

    borderColor: 'rgba(143, 227, 176, 0.55)',

    shadowColor: GREEN,
    shadowOpacity: 0.18,
  },

  accountCardSellerSelected: {
    backgroundColor: 'rgba(88, 61, 17, 0.70)',

    borderColor: 'rgba(255, 159, 0, 0.60)',

    shadowColor: ORANGE,
    shadowOpacity: 0.18,
  },

  // ─────────────────────────────────────────────────────────────
  // ICONS
  // ─────────────────────────────────────────────────────────────

  accountIcon: {
    width: 48,
    height: 48,

    borderRadius: 24,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 12,

    flexShrink: 0,
  },

  buyerIcon: {
    backgroundColor: 'rgba(117, 194, 148, 0.16)',

    borderWidth: 1,
    borderColor: 'rgba(143, 227, 176, 0.10)',
  },

  buyerIconSelected: {
    backgroundColor: 'rgba(143, 227, 176, 0.22)',

    borderColor: 'rgba(143, 227, 176, 0.25)',
  },

  sellerIcon: {
    backgroundColor: 'rgba(255, 159, 0, 0.15)',

    borderWidth: 1,
    borderColor: 'rgba(255, 159, 0, 0.10)',
  },

  sellerIconSelected: {
    backgroundColor: 'rgba(255, 159, 0, 0.23)',

    borderColor: 'rgba(255, 159, 0, 0.25)',
  },

  // ─────────────────────────────────────────────────────────────
  // ACCOUNT CONTENT
  // ─────────────────────────────────────────────────────────────

  accountContent: {
    flex: 1,

    minWidth: 0,
  },

  accountTitleRow: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 6,
  },

  accountTitle: {
    color: WHITE,

    fontSize: 18,
    lineHeight: 22,

    fontWeight: '800',

    flexShrink: 1,

    letterSpacing: -0.2,
  },

  buyerTitleColor: {
    color: GREEN,
  },

  sellerTitleColor: {
    color: ORANGE,
  },

  accountDescription: {
    color: 'rgba(255,255,255,0.72)',

    fontSize: 12.5,

    lineHeight: 17,

    fontWeight: '400',

    marginBottom: 10,
  },

  // ─────────────────────────────────────────────────────────────
  // ARROW / SELECTION
  // ─────────────────────────────────────────────────────────────

  arrowCircle: {
    width: 32,
    height: 32,

    borderRadius: 16,

    alignItems: 'center',
    justifyContent: 'center',

    borderWidth: 1.5,

    borderColor: 'rgba(255,255,255,0.65)',

    marginLeft: 10,

    flexShrink: 0,
  },

  arrowCircleBuyerSelected: {
    borderColor: GREEN,

    backgroundColor: 'rgba(143,227,176,0.10)',
  },

  arrowCircleSellerSelected: {
    borderColor: ORANGE,

    backgroundColor: 'rgba(255,159,0,0.10)',
  },

  // ─────────────────────────────────────────────────────────────
  // TAGS
  // ─────────────────────────────────────────────────────────────

  tagRow: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 6,
  },

  buyerTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 6,

    backgroundColor: 'rgba(38, 95, 66, 0.48)',

    borderWidth: 1,
    borderColor: 'rgba(143,227,176,0.06)',
  },

  buyerTagText: {
    color: '#A9E9C2',

    fontSize: 10,

    fontWeight: '700',
  },

  sellerTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 6,

    backgroundColor: 'rgba(116, 78, 18, 0.48)',

    borderWidth: 1,
    borderColor: 'rgba(255,159,0,0.06)',
  },

  sellerTagText: {
    color: '#FFB84D',

    fontSize: 10,

    fontWeight: '700',
  },

  // ─────────────────────────────────────────────────────────────
  // INFORMATION MESSAGE
  // ─────────────────────────────────────────────────────────────

  infoRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 14,

    paddingHorizontal: 6,
  },

  infoIcon: {
    width: 38,
    height: 38,

    borderRadius: 19,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: 'rgba(50, 108, 75, 0.20)',

    marginRight: 10,
  },

  infoText: {
    flex: 1,

    color: 'rgba(255,255,255,0.68)',

    fontSize: 12,

    lineHeight: 16,

    fontWeight: '500',
  },

  // ─────────────────────────────────────────────────────────────
  // CONTINUE BUTTON
  // ─────────────────────────────────────────────────────────────

  continueButton: {
    height: 50,

    width: '100%',

    borderRadius: 25,

    backgroundColor: ORANGE,

    marginTop: 14,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: ORANGE,
    shadowOpacity: 0.32,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 7,
  },

  continueButtonDisabled: {
    backgroundColor: 'rgba(255,159,0,0.42)',

    shadowOpacity: 0,
  },

  continueText: {
    color: WHITE,

    fontSize: 16,

    fontWeight: '800',

    letterSpacing: 0.1,
  },

  continueArrow: {
    marginLeft: 10,
  },

  // ─────────────────────────────────────────────────────────────
  // LOGIN LINK
  // ─────────────────────────────────────────────────────────────

  loginRow: {
    alignItems: 'center',
    justifyContent: 'center',

    marginTop: 14,

    paddingVertical: 4,
  },

  loginText: {
    color: 'rgba(255,255,255,0.68)',

    fontSize: 13,

    fontWeight: '500',
  },

  loginTextBold: {
    color: ORANGE,

    fontWeight: '800',
  },

  // ─────────────────────────────────────────────────────────────
  // BOTTOM
  // ─────────────────────────────────────────────────────────────

  bottomSpace: {
    height: 6,
  },
});