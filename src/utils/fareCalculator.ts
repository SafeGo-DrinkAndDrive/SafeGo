import { FareBreakdown, ServiceType } from '../types';

export const calculateFare = (
serviceType: ServiceType,
distanceKm: number = 0,
durationHours: number = 0,
packageType: string = '')
: FareBreakdown => {
  let estimatedFare = 0;
  let breakdown: any = { total: 0 };

  if (serviceType === 'Distance') {
    // Base: 10km = 1800 LKR
    // Additional: 100 LKR/km
    const baseDistance = 10;
    const baseFare = 1800;
    const additionalPerKm = 100;

    breakdown.baseFare = baseFare;

    if (distanceKm <= baseDistance) {
      estimatedFare = baseFare;
    } else {
      const extraDistance = distanceKm - baseDistance;
      const extraFare = extraDistance * additionalPerKm;
      breakdown.distanceFare = extraFare;
      estimatedFare = baseFare + extraFare;
    }
  } else if (serviceType === 'Hourly') {
    // Hourly rates
    const rates: Record<number, number> = {
      1: 2500,
      2: 3100,
      3: 3800,
      4: 4500,
      6: 5000,
      12: 6000
    };

    // Find closest matching hour or calculate based on highest
    const hours = Math.ceil(durationHours);
    const availableHours = Object.keys(rates).
    map(Number).
    sort((a, b) => a - b);

    let matchedHour = availableHours.find((h) => h >= hours) || 12;
    estimatedFare = rates[matchedHour];
    breakdown.hourlyFare = estimatedFare;
  } else if (serviceType === 'Full Day') {
    // Day Packages
    const packages: Record<string, number> = {
      '4h': 2500,
      '6h': 3500,
      '8h': 4000,
      '10h': 4500,
      '12h': 5000
    };

    estimatedFare = packages[packageType] || 2500;
    breakdown.packageFare = estimatedFare;
  }

  breakdown.total = estimatedFare;

  return {
    distance: distanceKm,
    duration: durationHours,
    estimatedFare,
    breakdown
  };
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};