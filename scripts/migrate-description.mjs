import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find all MEDIA items that have notes but no description yet
  const items = await prisma.item.findMany({
    where: { type: 'MEDIA', notes: { not: null }, description: null }
  })

  console.log(`Found ${items.length} MEDIA items to migrate`)

  for (const item of items) {
    await prisma.item.update({
      where: { id: item.id },
      data: { description: item.notes, notes: null }
    })
  }

  console.log('Migration complete.')
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
