import type {RequestHandler} from 'express';

import {environment} from '../config/environment.js';
import {findOrganizationsForUser} from './organization.repository.js';

const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const getRequestedOrganizationSlug = (hostname: string, header?: string) => {
  if (header) {
    return header.trim().toLowerCase();
  }

  const baseDomain = environment.organization.baseDomain;
  const suffix = baseDomain ? `.${baseDomain}` : '';

  if (!suffix || !hostname.endsWith(suffix)) {
    return null;
  }

  const slug = hostname.slice(0, -suffix.length).toLowerCase();
  return ORGANIZATION_SLUG_PATTERN.test(slug) ? slug : null;
};

export const requireOrganizationContext: RequestHandler = async (
  request,
  response,
  next,
) => {
  const userId = response.locals.currentUser?.id as string | undefined;

  if (!userId) {
    response.status(401).json({message: 'Authentication required'});
    return;
  }

  try {
    const organizationHeader = request.header('x-organization-slug');

    if (
      organizationHeader &&
      !ORGANIZATION_SLUG_PATTERN.test(organizationHeader.trim().toLowerCase())
    ) {
      response.status(400).json({message: 'Invalid organization context'});
      return;
    }

    const organizations = await findOrganizationsForUser(userId);
    const requestedSlug = getRequestedOrganizationSlug(
      request.hostname,
      organizationHeader,
    );
    const organization = requestedSlug
      ? organizations.find((item) => item.slug === requestedSlug)
      : organizations.length === 1
        ? organizations[0]
        : null;

    if (!organization) {
      response.status(requestedSlug ? 404 : 400).json({
        message: requestedSlug
          ? 'Organization not found'
          : 'Organization context required',
      });
      return;
    }

    response.locals.organizationContext = organization;
    next();
  } catch (error) {
    next(error);
  }
};
