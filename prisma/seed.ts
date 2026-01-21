import { PrismaClient, DealStage, TaskStatus, RelatedType, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Password complexity validation
function validatePasswordComplexity(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return { valid: errors.length === 0, errors }
}

async function main() {
  // Block seeding in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Database seeding is disabled in production. Use proper user management instead.'
    )
  }

  // Create seed user
  const seedPassword = process.env.SEED_USER_PASSWORD
  if (!seedPassword) {
    throw new Error('SEED_USER_PASSWORD environment variable is required')
  }

  // Validate password complexity
  const passwordValidation = validatePasswordComplexity(seedPassword)
  if (!passwordValidation.valid) {
    throw new Error(
      `Password does not meet complexity requirements:\n${passwordValidation.errors.join('\n')}`
    )
  }

  const hashedPassword = await bcrypt.hash(seedPassword, 12)

  const user = await prisma.user.upsert({
    where: { email: process.env.SEED_USER_EMAIL || 'admin@example.com' },
    update: {},
    create: {
      email: process.env.SEED_USER_EMAIL || 'admin@example.com',
      passwordHash: hashedPassword,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  })

  console.log('Created user:', user.email)

  // Create companies
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: 'TechCorp Solutions',
        website: 'https://techcorp.com',
        phone: '+1-555-0101',
        address: '123 Tech Street, Silicon Valley, CA',
        ownerUserId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Global Industries Inc',
        website: 'https://globalindustries.com',
        phone: '+1-555-0102',
        address: '456 Industrial Blvd, Detroit, MI',
        ownerUserId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'StartupXYZ',
        website: 'https://startupxyz.io',
        phone: '+1-555-0103',
        address: '789 Innovation Way, Austin, TX',
        ownerUserId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Enterprise Corp',
        website: 'https://enterprisecorp.com',
        phone: '+1-555-0104',
        address: '321 Corporate Ave, New York, NY',
        ownerUserId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Digital Agency Pro',
        website: 'https://digitalagencypro.com',
        phone: '+1-555-0105',
        address: '654 Marketing St, Los Angeles, CA',
        ownerUserId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Manufacturing Plus',
        website: 'https://manufacturingplus.com',
        phone: '+1-555-0106',
        address: '987 Factory Rd, Chicago, IL',
        ownerUserId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Consulting Partners',
        website: 'https://consultingpartners.com',
        phone: '+1-555-0107',
        address: '147 Consulting Ln, Boston, MA',
        ownerUserId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Retail Solutions Ltd',
        website: 'https://retailsolutions.com',
        phone: '+1-555-0108',
        address: '258 Retail Plaza, Miami, FL',
        ownerUserId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Healthcare Systems',
        website: 'https://healthcaresystems.com',
        phone: '+1-555-0109',
        address: '369 Medical Center Dr, Atlanta, GA',
        ownerUserId: user.id,
      },
    }),
    prisma.company.create({
      data: {
        name: 'Financial Services Co',
        website: 'https://financialservices.com',
        phone: '+1-555-0110',
        address: '741 Finance St, Wall Street, NY',
        ownerUserId: user.id,
      },
    }),
  ])

  console.log('Created companies:', companies.length)

  // Create contacts
  const contacts = await Promise.all([
    prisma.contact.create({
      data: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@techcorp.com',
        phone: '+1-555-1001',
        title: 'CEO',
        companyId: companies[0].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@globalindustries.com',
        phone: '+1-555-1002',
        title: 'VP Sales',
        companyId: companies[1].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Mike',
        lastName: 'Davis',
        email: 'mike.davis@startupxyz.io',
        phone: '+1-555-1003',
        title: 'CTO',
        companyId: companies[2].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Emily',
        lastName: 'Brown',
        email: 'emily.brown@enterprisecorp.com',
        phone: '+1-555-1004',
        title: 'Marketing Director',
        companyId: companies[3].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'David',
        lastName: 'Wilson',
        email: 'david.wilson@digitalagencypro.com',
        phone: '+1-555-1005',
        title: 'Creative Director',
        companyId: companies[4].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Lisa',
        lastName: 'Garcia',
        email: 'lisa.garcia@manufacturingplus.com',
        phone: '+1-555-1006',
        title: 'Operations Manager',
        companyId: companies[5].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Robert',
        lastName: 'Miller',
        email: 'robert.miller@consultingpartners.com',
        phone: '+1-555-1007',
        title: 'Senior Consultant',
        companyId: companies[6].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Jennifer',
        lastName: 'Taylor',
        email: 'jennifer.taylor@retailsolutions.com',
        phone: '+1-555-1008',
        title: 'Store Manager',
        companyId: companies[7].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Kevin',
        lastName: 'Anderson',
        email: 'kevin.anderson@healthcaresystems.com',
        phone: '+1-555-1009',
        title: 'IT Director',
        companyId: companies[8].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Amanda',
        lastName: 'Thomas',
        email: 'amanda.thomas@financialservices.com',
        phone: '+1-555-1010',
        title: 'Financial Advisor',
        companyId: companies[9].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Chris',
        lastName: 'White',
        email: 'chris.white@techcorp.com',
        phone: '+1-555-1011',
        title: 'Sales Manager',
        companyId: companies[0].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Rachel',
        lastName: 'Martinez',
        email: 'rachel.martinez@startupxyz.io',
        phone: '+1-555-1012',
        title: 'Product Manager',
        companyId: companies[2].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Brian',
        lastName: 'Lee',
        email: 'brian.lee@enterprisecorp.com',
        phone: '+1-555-1013',
        title: 'HR Director',
        companyId: companies[3].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Michelle',
        lastName: 'Clark',
        email: 'michelle.clark@digitalagencypro.com',
        phone: '+1-555-1014',
        title: 'Account Manager',
        companyId: companies[4].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Steve',
        lastName: 'Rodriguez',
        email: 'steve.rodriguez@manufacturingplus.com',
        phone: '+1-555-1015',
        title: 'Quality Control',
        companyId: companies[5].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Laura',
        lastName: 'Lewis',
        email: 'laura.lewis@consultingpartners.com',
        phone: '+1-555-1016',
        title: 'Project Manager',
        companyId: companies[6].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Daniel',
        lastName: 'Walker',
        email: 'daniel.walker@retailsolutions.com',
        phone: '+1-555-1017',
        title: 'Buyer',
        companyId: companies[7].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Stephanie',
        lastName: 'Hall',
        email: 'stephanie.hall@healthcaresystems.com',
        phone: '+1-555-1018',
        title: 'Nurse Manager',
        companyId: companies[8].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Jason',
        lastName: 'Young',
        email: 'jason.young@financialservices.com',
        phone: '+1-555-1019',
        title: 'Investment Banker',
        companyId: companies[9].id,
        ownerUserId: user.id,
      },
    }),
    prisma.contact.create({
      data: {
        firstName: 'Nicole',
        lastName: 'King',
        email: 'nicole.king@email.com',
        phone: '+1-555-1020',
        title: 'Freelance Designer',
        ownerUserId: user.id,
      },
    }),
  ])

  console.log('Created contacts:', contacts.length)

  // Create deals
  const deals = await Promise.all([
    prisma.deal.create({
      data: {
        title: 'Enterprise Software License',
        amountCents: 25000000, // $250,000
        stage: DealStage.PROPOSAL,
        closeDate: new Date('2024-02-15'),
        companyId: companies[0].id,
        contactId: contacts[0].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Manufacturing Automation System',
        amountCents: 50000000, // $500,000
        stage: DealStage.NEGOTIATION,
        closeDate: new Date('2024-01-30'),
        companyId: companies[1].id,
        contactId: contacts[1].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Mobile App Development',
        amountCents: 7500000, // $75,000
        stage: DealStage.WON,
        closeDate: new Date('2023-12-20'),
        companyId: companies[2].id,
        contactId: contacts[2].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Digital Marketing Campaign',
        amountCents: 1500000, // $15,000
        stage: DealStage.QUALIFIED,
        closeDate: new Date('2024-03-10'),
        companyId: companies[3].id,
        contactId: contacts[3].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Website Redesign',
        amountCents: 2500000, // $25,000
        stage: DealStage.LEAD,
        companyId: companies[4].id,
        contactId: contacts[4].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Equipment Upgrade',
        amountCents: 12000000, // $120,000
        stage: DealStage.PROPOSAL,
        closeDate: new Date('2024-02-28'),
        companyId: companies[5].id,
        contactId: contacts[5].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Consulting Services',
        amountCents: 800000, // $8,000
        stage: DealStage.WON,
        closeDate: new Date('2024-01-05'),
        companyId: companies[6].id,
        contactId: contacts[6].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'POS System Implementation',
        amountCents: 3000000, // $30,000
        stage: DealStage.NEGOTIATION,
        closeDate: new Date('2024-02-20'),
        companyId: companies[7].id,
        contactId: contacts[7].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Healthcare IT System',
        amountCents: 15000000, // $150,000
        stage: DealStage.QUALIFIED,
        closeDate: new Date('2024-04-15'),
        companyId: companies[8].id,
        contactId: contacts[8].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Financial Planning Software',
        amountCents: 5000000, // $50,000
        stage: DealStage.LEAD,
        companyId: companies[9].id,
        contactId: contacts[9].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Cloud Migration Project',
        amountCents: 18000000, // $180,000
        stage: DealStage.LOST,
        closeDate: new Date('2023-11-30'),
        companyId: companies[0].id,
        contactId: contacts[10].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'AI Chatbot Implementation',
        amountCents: 9500000, // $95,000
        stage: DealStage.PROPOSAL,
        closeDate: new Date('2024-03-01'),
        companyId: companies[2].id,
        contactId: contacts[11].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Brand Identity Package',
        amountCents: 1200000, // $12,000
        stage: DealStage.WON,
        closeDate: new Date('2024-01-15'),
        companyId: companies[4].id,
        contactId: contacts[13].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Supply Chain Optimization',
        amountCents: 22000000, // $220,000
        stage: DealStage.QUALIFIED,
        closeDate: new Date('2024-05-01'),
        companyId: companies[5].id,
        contactId: contacts[14].id,
        ownerUserId: user.id,
      },
    }),
    prisma.deal.create({
      data: {
        title: 'Market Research Study',
        amountCents: 600000, // $6,000
        stage: DealStage.WON,
        closeDate: new Date('2023-12-10'),
        companyId: companies[6].id,
        contactId: contacts[15].id,
        ownerUserId: user.id,
      },
    }),
  ])

  console.log('Created deals:', deals.length)

  // Create tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Follow up on Enterprise Software proposal',
        dueAt: new Date('2024-01-25'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.DEAL,
        relatedId: deals[0].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Prepare demo for Manufacturing Automation',
        dueAt: new Date('2024-01-28'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.DEAL,
        relatedId: deals[1].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Send contract for Mobile App Development',
        status: TaskStatus.DONE,
        relatedType: RelatedType.DEAL,
        relatedId: deals[2].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Research competitors for Digital Marketing',
        dueAt: new Date('2024-01-20'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.DEAL,
        relatedId: deals[3].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Schedule discovery call with Website client',
        dueAt: new Date('2024-01-22'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.DEAL,
        relatedId: deals[4].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Review equipment specifications',
        status: TaskStatus.DONE,
        relatedType: RelatedType.DEAL,
        relatedId: deals[5].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Deliver final report to Consulting client',
        status: TaskStatus.DONE,
        relatedType: RelatedType.DEAL,
        relatedId: deals[6].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Coordinate with vendor for POS system',
        dueAt: new Date('2024-01-30'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.DEAL,
        relatedId: deals[7].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Compliance review for Healthcare IT',
        dueAt: new Date('2024-02-05'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.DEAL,
        relatedId: deals[8].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Create product demo for Financial Planning',
        dueAt: new Date('2024-02-01'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.DEAL,
        relatedId: deals[9].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Call John Smith about Enterprise license',
        dueAt: new Date('2024-01-18'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.CONTACT,
        relatedId: contacts[0].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Email proposal to Sarah Johnson',
        status: TaskStatus.DONE,
        relatedType: RelatedType.CONTACT,
        relatedId: contacts[1].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Schedule meeting with TechCorp Solutions',
        dueAt: new Date('2024-01-24'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.COMPANY,
        relatedId: companies[0].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Update contact info for StartupXYZ',
        status: TaskStatus.DONE,
        relatedType: RelatedType.COMPANY,
        relatedId: companies[2].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Review quarterly goals',
        dueAt: new Date('2024-01-31'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.NONE,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Clean up old leads',
        dueAt: new Date('2024-02-10'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.NONE,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Update CRM training materials',
        status: TaskStatus.DONE,
        relatedType: RelatedType.NONE,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Prepare monthly sales report',
        dueAt: new Date('2024-01-29'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.NONE,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Follow up on lost deal analysis',
        dueAt: new Date('2024-02-02'),
        status: TaskStatus.OPEN,
        relatedType: RelatedType.DEAL,
        relatedId: deals[10].id,
        ownerUserId: user.id,
      },
    }),
    prisma.task.create({
      data: {
        title: 'Send invoice for Brand Identity work',
        status: TaskStatus.DONE,
        relatedType: RelatedType.DEAL,
        relatedId: deals[12].id,
        ownerUserId: user.id,
      },
    }),
  ])

  console.log('Created tasks:', tasks.length)

  // Create notes
  const notes = await Promise.all([
    prisma.note.create({
      data: {
        body: 'John is very interested in our enterprise solution. Mentioned they have a Q1 budget for software upgrades.',
        relatedType: RelatedType.CONTACT,
        relatedId: contacts[0].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Sarah mentioned their current system is outdated and causing productivity issues. They need automation solutions.',
        relatedType: RelatedType.CONTACT,
        relatedId: contacts[1].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Successfully completed mobile app project. Client was very satisfied with the timeline and quality.',
        relatedType: RelatedType.DEAL,
        relatedId: deals[2].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'TechCorp Solutions is a Fortune 500 company with global operations. They require enterprise-grade security.',
        relatedType: RelatedType.COMPANY,
        relatedId: companies[0].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'StartupXYZ has been growing rapidly. They mentioned needing scalable solutions for their expanding team.',
        relatedType: RelatedType.COMPANY,
        relatedId: companies[2].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Enterprise Corp has a complex approval process. Need to involve multiple stakeholders in the decision.',
        relatedType: RelatedType.COMPANY,
        relatedId: companies[3].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Digital Agency Pro specializes in B2B marketing. They work with several Fortune 500 clients.',
        relatedType: RelatedType.COMPANY,
        relatedId: companies[4].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Manufacturing Plus is considering a complete digital transformation. Interested in IoT and automation.',
        relatedType: RelatedType.COMPANY,
        relatedId: companies[5].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Consulting Partners provides strategic consulting. They have a strong reputation in the industry.',
        relatedType: RelatedType.COMPANY,
        relatedId: companies[6].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Retail Solutions Ltd operates 50+ stores across the Southeast. They need modern POS and inventory systems.',
        relatedType: RelatedType.COMPANY,
        relatedId: companies[7].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Healthcare Systems is HIPAA compliant and requires all solutions to meet healthcare industry standards.',
        relatedType: RelatedType.COMPANY,
        relatedId: companies[8].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Financial Services Co serves high-net-worth individuals. They require top-tier security and compliance.',
        relatedType: RelatedType.COMPANY,
        relatedId: companies[9].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Lost the cloud migration deal to a competitor with lower pricing. Need to review our competitive positioning.',
        relatedType: RelatedType.DEAL,
        relatedId: deals[10].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Client requested additional features for the AI chatbot including multilingual support and custom integrations.',
        relatedType: RelatedType.DEAL,
        relatedId: deals[11].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Completed brand identity package including logo, color palette, and brand guidelines. Client very happy.',
        relatedType: RelatedType.DEAL,
        relatedId: deals[12].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Supply chain optimization project has high potential. Client has multiple facilities that need modernization.',
        relatedType: RelatedType.DEAL,
        relatedId: deals[13].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Market research study provided valuable insights. Client used findings to expand into new markets.',
        relatedType: RelatedType.DEAL,
        relatedId: deals[14].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Nicole is a freelance designer with expertise in UI/UX. She has worked with several tech startups.',
        relatedType: RelatedType.CONTACT,
        relatedId: contacts[19].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Chris is the sales manager at TechCorp. He handles all vendor relationships and procurement decisions.',
        relatedType: RelatedType.CONTACT,
        relatedId: contacts[10].id,
        ownerUserId: user.id,
      },
    }),
    prisma.note.create({
      data: {
        body: 'Rachel has been with StartupXYZ since the early days. She has deep knowledge of their product roadmap.',
        relatedType: RelatedType.CONTACT,
        relatedId: contacts[11].id,
        ownerUserId: user.id,
      },
    }),
  ])

  console.log('Created notes:', notes.length)
  console.log('Seed data created successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })