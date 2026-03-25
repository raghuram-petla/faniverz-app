import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@shared/constants', () => ({
  ACTOR_AVATAR_SIZE: 120,
  GENDER_LABELS: { 1: 'Female', 2: 'Male', 3: 'Non-binary' },
}));

vi.mock('@shared/colors', () => ({
  colors: {
    black: '#000000',
    white: '#ffffff',
    white5: 'rgba(255,255,255,0.05)',
    white10: 'rgba(255,255,255,0.1)',
    white40: 'rgba(255,255,255,0.4)',
    white60: 'rgba(255,255,255,0.6)',
    red600: '#dc2626',
    red400: '#f87171',
  },
}));

const mockGetImageUrl = vi.fn(
  (_url: string, _size: string, _bucket: string) => 'https://cdn/actor.jpg',
);
vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string, size: string, bucket: string) => mockGetImageUrl(url, size, bucket),
}));

import { ActorDetailPreview } from '@/components/preview/ActorDetailPreview';

const defaultProps = {
  name: 'Mahesh Babu',
  photoUrl: '',
  personType: 'actor' as const,
  gender: null,
  birthDate: '',
  placeOfBirth: '',
  heightCm: null,
  biography: '',
};

describe('ActorDetailPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the actor name', () => {
    render(<ActorDetailPreview {...defaultProps} />);
    expect(screen.getByText('Mahesh Babu')).toBeInTheDocument();
  });

  it('shows "Actor Name" placeholder when name is empty', () => {
    render(<ActorDetailPreview {...defaultProps} name="" />);
    expect(screen.getByText('Actor Name')).toBeInTheDocument();
  });

  it('shows "Actor" type badge for actor', () => {
    render(<ActorDetailPreview {...defaultProps} personType="actor" />);
    expect(screen.getByText('Actor')).toBeInTheDocument();
  });

  it('shows "Technician" type badge for technician', () => {
    render(<ActorDetailPreview {...defaultProps} personType="technician" />);
    expect(screen.getByText('Technician')).toBeInTheDocument();
  });

  it('shows gender label when gender is 2 (Male)', () => {
    render(<ActorDetailPreview {...defaultProps} gender={2} />);
    expect(screen.getByText('Male')).toBeInTheDocument();
  });

  it('shows gender label when gender is 1 (Female)', () => {
    render(<ActorDetailPreview {...defaultProps} gender={1} />);
    expect(screen.getByText('Female')).toBeInTheDocument();
  });

  it('does not show gender badge when gender is null', () => {
    render(<ActorDetailPreview {...defaultProps} gender={null} />);
    expect(screen.queryByText('Male')).not.toBeInTheDocument();
    expect(screen.queryByText('Female')).not.toBeInTheDocument();
  });

  it('does not show gender badge when gender is 0 (not set)', () => {
    render(<ActorDetailPreview {...defaultProps} gender={0} />);
    expect(screen.queryByText('Male')).not.toBeInTheDocument();
  });

  it('shows photo when photoUrl is set', () => {
    const { container } = render(
      <ActorDetailPreview {...defaultProps} photoUrl="https://cdn/actor.jpg" />,
    );
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('shows placeholder emoji when photoUrl is empty', () => {
    render(<ActorDetailPreview {...defaultProps} photoUrl="" />);
    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  it('renders bio info card when birthDate is set', () => {
    render(<ActorDetailPreview {...defaultProps} birthDate="1975-08-09" />);
    expect(screen.getByText('Born')).toBeInTheDocument();
    // Date should be formatted
    expect(screen.getByText(/Aug/)).toBeInTheDocument();
  });

  it('renders bio info card when placeOfBirth is set', () => {
    render(<ActorDetailPreview {...defaultProps} placeOfBirth="Hyderabad" />);
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('Hyderabad')).toBeInTheDocument();
  });

  it('renders bio info card when heightCm is set', () => {
    render(<ActorDetailPreview {...defaultProps} heightCm={178} />);
    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.getByText('178 cm')).toBeInTheDocument();
  });

  it('does not render bio info card when all bio fields are empty/null', () => {
    render(<ActorDetailPreview {...defaultProps} birthDate="" placeOfBirth="" heightCm={null} />);
    expect(screen.queryByText('Born')).not.toBeInTheDocument();
    expect(screen.queryByText('Height')).not.toBeInTheDocument();
  });

  it('renders biography when provided', () => {
    render(<ActorDetailPreview {...defaultProps} biography="Born in Andhra Pradesh." />);
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Born in Andhra Pradesh.')).toBeInTheDocument();
    expect(screen.getByText('Read more')).toBeInTheDocument();
  });

  it('does not render biography section when empty', () => {
    render(<ActorDetailPreview {...defaultProps} biography="" />);
    expect(screen.queryByText('About')).not.toBeInTheDocument();
    expect(screen.queryByText('Read more')).not.toBeInTheDocument();
  });

  it('renders filmography placeholder', () => {
    render(<ActorDetailPreview {...defaultProps} />);
    expect(screen.getByText('Filmography')).toBeInTheDocument();
    expect(screen.getByText('Filmography will appear here')).toBeInTheDocument();
  });

  it('does not render placeOfBirth in bio info if empty', () => {
    render(<ActorDetailPreview {...defaultProps} birthDate="1975-08-09" placeOfBirth="" />);
    expect(screen.queryByText('From')).not.toBeInTheDocument();
  });

  it('does not render birthDate in bio info if not provided', () => {
    render(<ActorDetailPreview {...defaultProps} heightCm={178} />);
    expect(screen.queryByText('Born')).not.toBeInTheDocument();
  });

  it('does not render bio info card when heightCm=0 (falsy)', () => {
    // heightCm=0 is falsy, so hasBioInfo (birthDate || placeOfBirth || heightCm) is falsy
    // The bio info card won't render at all
    render(<ActorDetailPreview {...defaultProps} heightCm={0} />);
    expect(screen.queryByText('Height')).not.toBeInTheDocument();
  });

  it('falls back to raw photoUrl when getImageUrl returns null', () => {
    mockGetImageUrl.mockReturnValue(null as unknown as string);
    const { container } = render(
      <ActorDetailPreview {...defaultProps} photoUrl="https://raw.example.com/photo.jpg" />,
    );
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://raw.example.com/photo.jpg');
    mockGetImageUrl.mockImplementation(() => 'https://cdn/actor.jpg');
  });
});
