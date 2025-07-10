import { prisma } from '../utils/prisma';

export class MatchingService {
  async performAutoMatching(sessionId: string) {
    // Get all sections for this session
    const transcriptions = await prisma.transcriptionData.findMany({
      where: { sessionId },
      include: {
        sections: {
          orderBy: { sectionNumber: 'asc' }
        }
      }
    });

    // Separate NOTTA and Manus sections
    const nottaSections = transcriptions
      .filter(t => t.source === 'NOTTA')
      .flatMap(t => t.sections);
    
    const manusSections = transcriptions
      .filter(t => t.source === 'MANUS')
      .flatMap(t => t.sections);

    // Match sections by section number
    const mappings = [];
    
    for (const nottaSection of nottaSections) {
      const matchingManusSection = manusSections.find(
        m => m.sectionNumber === nottaSection.sectionNumber
      );
      
      if (matchingManusSection) {
        // Calculate confidence based on timestamp similarity
        const confidence = this.calculateConfidence(
          nottaSection.timestamp,
          matchingManusSection.timestamp
        );
        
        mappings.push({
          sessionId,
          nottaSectionId: nottaSection.id,
          manusSectionId: matchingManusSection.id,
          confidence,
          isManuallyMapped: false
        });
      }
    }

    // Bulk create mappings
    if (mappings.length > 0) {
      await prisma.sectionMapping.createMany({
        data: mappings
      });
    }

    return mappings;
  }

  private calculateConfidence(timestamp1: string, timestamp2: string): number {
    // Simple confidence calculation based on timestamp difference
    const [h1, m1] = timestamp1.split(':').map(Number);
    const [h2, m2] = timestamp2.split(':').map(Number);
    
    const totalMinutes1 = h1 * 60 + m1;
    const totalMinutes2 = h2 * 60 + m2;
    
    const diff = Math.abs(totalMinutes1 - totalMinutes2);
    
    // If timestamps match exactly, confidence is 1
    if (diff === 0) return 1.0;
    // If within 1 minute, high confidence
    if (diff <= 1) return 0.9;
    // If within 2 minutes, medium confidence
    if (diff <= 2) return 0.7;
    // Otherwise, low confidence
    return 0.5;
  }

  async getMappingsBySession(sessionId: string) {
    return await prisma.sectionMapping.findMany({
      where: { sessionId },
      include: {
        nottaSection: true,
        manusSection: true
      }
    });
  }

  async updateMapping(
    mappingId: string,
    nottaSectionId: string,
    manusSectionId: string
  ) {
    return await prisma.sectionMapping.update({
      where: { id: mappingId },
      data: {
        nottaSectionId,
        manusSectionId,
        isManuallyMapped: true,
        confidence: 1.0
      }
    });
  }
}