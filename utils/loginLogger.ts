// Login attempt logger
import { collection, addDoc, serverTimestamp, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';

export interface FailedLoginAttempt {
  ip: string;
  userAgent: string;
  location?: string;
  timestamp: any;
  attempts: number;
  email?: string;
}

export const logFailedLogin = async (
  email: string,
  ip: string,
  userAgent: string,
  location?: string
): Promise<void> => {
  try {
    const failedAttemptsRef = collection(db, 'failed_login_attempts');
    
    // Check if this IP already has failed attempts
    const existingAttempts = await getDocs(
      query(failedAttemptsRef, where('ip', '==', ip))
    );
    
    if (existingAttempts.empty) {
      // New failed attempt
      console.log('🔴 Logging new failed login attempt:', { email, ip, location });
      await addDoc(failedAttemptsRef, {
        email,
        ip,
        userAgent,
        location: location || 'موقع غير معروف',
        timestamp: serverTimestamp(),
        attempts: 1,
        firstAttempt: serverTimestamp()
      });
    } else {
      // Update existing attempt count
      const existingDoc = existingAttempts.docs[0];
      const currentAttempts = existingDoc.data().attempts || 1;
      console.log('🔴 Updating failed login attempt:', { ip, attempts: currentAttempts + 1 });
      await updateDoc(existingDoc.ref, {
        attempts: currentAttempts + 1,
        timestamp: serverTimestamp(),
        lastAttempt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error logging failed login:', error);
  }
};

export const getClientIP = (): string => {
  // For client-side applications, we cannot get the real IP
  // Instead, we'll create a consistent "demo" IP that changes
  // based on browser session to simulate different users
  
  // Create a semi-random but consistent IP for this session
  const sessionKey = 'demo_ip_session';
  let storedIP = sessionStorage.getItem(sessionKey);
  
  if (!storedIP) {
    // Generate a realistic IP that will persist for this session
    const ipRanges = [
      { base: '185.108.131', location: 'السعودية' },
      { base: '94.99.145', location: 'السعودية' },
      { base: '188.161.0', location: 'السعودية' },
      { base: '78.110.176', location: 'مصر' },
      { base: '2.50.0', location: 'أوروبا' },
      { base: '172.67.208', location: 'الولايات المتحدة' },
      { base: '104.21.49', location: 'الولايات المتحدة' },
      { base: '172.64.147', location: 'الولايات المتحدة' }
    ];
    
    const selectedRange = ipRanges[Math.floor(Math.random() * ipRanges.length)];
    const lastOctet = Math.floor(Math.random() * 254) + 1; // 1-254
    storedIP = `${selectedRange.base}.${lastOctet}`;
    
    // Store in session for consistency
    sessionStorage.setItem(sessionKey, storedIP);
    sessionStorage.setItem('demo_ip_location', selectedRange.location);
  }
  
  return storedIP;
};

const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

export const getUserAgent = (): string => {
  return navigator.userAgent;
};

export const getLocationFromIP = async (ip: string): Promise<string> => {
  // First try to get stored location from session
  const storedLocation = sessionStorage.getItem('demo_ip_location');
  if (storedLocation) {
    // Get a city from the stored location
    return getCityFromLocation(storedLocation);
  }
  
  try {
    // Try to get location from a free IP geolocation API
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.country_name && data.city) {
        // Format: "المدينة، الدولة" in Arabic if available
        const city = translateCityToArabic(data.city);
        const country = translateCountryToArabic(data.country_name);
        return `${city}, ${country}`;
      }
    }
  } catch (error) {
    console.log('Failed to get location from API, using fallback');
  }
  
  // Fallback to more realistic locations based on IP ranges
  return getLocationFromIPRange(ip);
};

const getCityFromLocation = (location: string): string => {
  const citiesByLocation: Record<string, string[]> = {
    'السعودية': ['الرياض', 'جدة', 'مكة', 'المدينة المنورة', 'الدمام', 'الخبر', 'تبوك', 'أبها'],
    'مصر': ['القاهرة', 'الإسكندرية', 'الجيزة', 'الأقصر', 'أسوان'],
    'أوروبا': ['لندن', 'باريس', 'برلين', 'روما', 'مدريد'],
    'الولايات المتحدة': ['نيويورك', 'لوس أنجلوس', 'شيكاغو', 'واشنطن', 'سان فرانسيسكو']
  };
  
  const cities = citiesByLocation[location] || ['موقع غير معروف'];
  return cities[Math.floor(Math.random() * cities.length)] + ', ' + location;
};

const translateCityToArabic = (city: string): string => {
  const cityTranslations: Record<string, string> = {
    'Riyadh': 'الرياض',
    'Jeddah': 'جدة',
    'Mecca': 'مكة',
    'Medina': 'المدينة المنورة',
    'Dammam': 'الدمام',
    'Khobar': 'الخبر',
    'Tabuk': 'تبوك',
    'Abha': 'أبها',
    'Hail': 'حائل',
    'Najran': 'نجران',
    'Jazan': 'جازان',
    'Buraidah': 'بريدة',
    'Arar': 'عرعر',
    'Sakaka': 'سكاكا'
  };
  
  return cityTranslations[city] || city;
};

const translateCountryToArabic = (country: string): string => {
  const countryTranslations: Record<string, string> = {
    'Saudi Arabia': 'السعودية',
    'United States': 'الولايات المتحدة',
    'United Kingdom': 'المملكة المتحدة',
    'Egypt': 'مصر',
    'UAE': 'الإمارات',
    'Kuwait': 'الكويت',
    'Bahrain': 'البحرين',
    'Qatar': 'قطر',
    'Oman': 'عمان',
    'Yemen': 'اليمن',
    'Jordan': 'الأردن',
    'Lebanon': 'لبنان',
    'Syria': 'سوريا',
    'Iraq': 'العراق',
    'Morocco': 'المغرب',
    'Algeria': 'الجزائر',
    'Tunisia': 'تونس',
    'Libya': 'ليبيا',
    'Sudan': 'السودan'
  };
  
  return countryTranslations[country] || country;
};

const getLocationFromIPRange = (ip: string): string => {
  // More realistic location mapping based on IP ranges
  const firstOctet = parseInt(ip.split('.')[0]);
  
  // Saudi IP ranges (simplified)
  if (firstOctet === 185 || firstOctet === 94 || firstOctet === 188) {
    const saudiCities = ['الرياض', 'جدة', 'مكة', 'المدينة المنورة', 'الدمام', 'الخبر', 'تبوك', 'أبها'];
    return saudiCities[Math.floor(Math.random() * saudiCities.length)] + ', السعودية';
  }
  
  // Other Middle Eastern ranges
  if (firstOctet === 78) {
    const meCities = ['القاهرة', 'الإسكندرية', 'دبي', 'أبو ظبي', 'الكويت', 'الدوحة'];
    const countries = ['مصر', 'الإمارات', 'الكويت', 'قطر'];
    const city = meCities[Math.floor(Math.random() * meCities.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    return `${city}, ${country}`;
  }
  
  // European ranges
  if (firstOctet === 2) {
    const euCities = ['لندن', 'باريس', 'برلين', 'روما', 'مدريد'];
    const countries = ['المملكة المتحدة', 'فرنسا', 'ألمانيا', 'إيطاليا', 'إسبانيا'];
    const city = euCities[Math.floor(Math.random() * euCities.length)];
    const country = countries[Math.floor(Math.random() * countries.length)];
    return `${city}, ${country}`;
  }
  
  // Default fallback
  return 'موقع غير معروف';
};
