import { render, screen } from '@testing-library/react';
import { ActorDetailPreview } from '@/components/preview/ActorDetailPreview';

const defaultProps = {
  name: 'Allu Arjun',
  photoUrl: 'https://example.com/photo.jpg',
  personType: 'actor' as const,
  gender: 2,
  birthDate: '1983-04-08',
  placeOfBirth: 'Chennai, India',
  heightCm: 175,
  biography: 'Allu Arjun is a renowned Indian actor known for his work in Telugu cinema.',
};

describe('ActorDetailPreview', () => {
  it('renders actor name', () => {
    render(<ActorDetailPreview {...defaultProps} />);
    expect(screen.getByText('Allu Arjun')).toBeInTheDocument();
  });

  it('renders type badge', () => {
    render(<ActorDetailPreview {...defaultProps} />);
    expect(screen.getByText('Actor')).toBeInTheDocument();
  });

  it('renders Technician badge for technician type', () => {
    render(<ActorDetailPreview {...defaultProps} personType="technician" />);
    expect(screen.getByText('Technician')).toBeInTheDocument();
  });

  it('renders gender badge', () => {
    render(<ActorDetailPreview {...defaultProps} gender={2} />);
    expect(screen.getByText('Male')).toBeInTheDocument();
  });

  it('renders bio card with birth date', () => {
    render(<ActorDetailPreview {...defaultProps} />);
    expect(screen.getByText('Born')).toBeInTheDocument();
    // Date formatting depends on locale/timezone — just check a 1983 date renders
    expect(screen.getByText(/1983/)).toBeInTheDocument();
  });

  it('renders place of birth', () => {
    render(<ActorDetailPreview {...defaultProps} />);
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('Chennai, India')).toBeInTheDocument();
  });

  it('renders height', () => {
    render(<ActorDetailPreview {...defaultProps} />);
    expect(screen.getByText('Height')).toBeInTheDocument();
    expect(screen.getByText('175 cm')).toBeInTheDocument();
  });

  it('renders biography section', () => {
    render(<ActorDetailPreview {...defaultProps} />);
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText(defaultProps.biography)).toBeInTheDocument();
    expect(screen.getByText('Read more')).toBeInTheDocument();
  });

  it('renders placeholder when no photo', () => {
    render(<ActorDetailPreview {...defaultProps} photoUrl="" />);
    expect(screen.getByText('👤')).toBeInTheDocument();
  });

  it('renders default name when name is empty', () => {
    render(<ActorDetailPreview {...defaultProps} name="" />);
    expect(screen.getByText('Actor Name')).toBeInTheDocument();
  });

  it('renders filmography section header', () => {
    render(<ActorDetailPreview {...defaultProps} />);
    expect(screen.getByText('Filmography')).toBeInTheDocument();
  });
});
