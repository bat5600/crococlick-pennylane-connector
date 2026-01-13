'use strict';

const express = require('express');
const { request } = require('../lib/ghlClient');

const router = express.Router();

const getUserId = (req) => {
  const userId = req.header('x-user-id');
  if (!userId) {
    const err = new Error('Missing x-user-id header');
    err.statusCode = 401;
    throw err;
  }
  return userId;
};

router.get('/contacts', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { limit = 50, offset = 0 } = req.query;
    const data = await request({
      userId,
      method: 'GET',
      path: '/contacts',
      params: { limit, skip: offset }
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post('/contacts', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const payload = req.body;
    const data = await request({
      userId,
      method: 'POST',
      path: '/contacts',
      data: payload
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.put('/contacts/:id', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const data = await request({
      userId,
      method: 'PUT',
      path: `/contacts/${id}`,
      data: req.body
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/workflows', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const data = await request({
      userId,
      method: 'GET',
      path: '/workflows'
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/calendars', async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const data = await request({
      userId,
      method: 'GET',
      path: '/calendars'
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
