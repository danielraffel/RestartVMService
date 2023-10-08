// Import required modules
const { google } = require('googleapis');
const compute = google.compute('v1');

// Define an async function to restart VMs based on specific conditions
exports.restartVM = async (req, res) => {
  
  // Log the request body for debugging
  console.log("Request body:", req.body);

  // Extract secrets and VM state from the environment and request body
  const secret = process.env.secret;
  const payloadSecret = req.body.secret;
  const responseState = req.body.responseState;

  // Check if the custom header or payload secret matches and verify VM state 
  // (only allow certain error states)
  if ((req.headers['x-custom-secret'] !== secret && payloadSecret !== secret) || 
      (!responseState.startsWith('Reporting Error') && responseState !== 'Not Responding' && responseState !== 'Request Timeout')) {
    return res.status(403).send('Forbidden or Not Reporting Error/Not Responding/Request Timeout');
  }

  // Authenticate with Google Cloud using required scopes
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  // Set project ID and target IP (should be replaced with actual values)
  const projectId = 'YOUR_PROJECT_ID';
  const targetIP = 'YOUR_STATIC_IP';

  // Fetch all zones for the given project
  const zonesResponse = await compute.zones.list({ project: projectId, auth: auth });
  const zones = zonesResponse.data.items.map(zone => zone.name);

  // Variables to keep track of the instance to be restarted
  let maxInstanceNumber = -1;
  let instanceToRestart = null;
  let zoneToRestart = null;

  // Loop through all zones to find instances
  for (const zone of zones) {
    const instancesResponse = await compute.instances.list({ project: projectId, zone: zone, auth: auth });
    const instances = instancesResponse.data.items || [];

    // Loop through instances to find the one with the maximum instance number and matching target IP
    for (const instance of instances) {
      const instanceName = instance.name;
      const externalIP = instance.networkInterfaces?.[0]?.accessConfigs?.[0]?.natIP;
      const instanceNumber = parseInt(instanceName.split('-').pop(), 10);

      if (instanceNumber > maxInstanceNumber && externalIP === targetIP) {
        maxInstanceNumber = instanceNumber;
        instanceToRestart = instanceName;
        zoneToRestart = zone;
      }
    }
  }

  // If a matching instance is found, perform operations on it
  if (instanceToRestart) {
    const request = {
      project: projectId,
      zone: zoneToRestart,
      instance: instanceToRestart,
      auth: auth
    };

    try {
      // Fetch the details of the instance to determine its current status
      const instanceDetails = await compute.instances.get(request);
      console.log("Instance details response:", JSON.stringify(instanceDetails));

      if (!instanceDetails || !instanceDetails.data) {
        return res.status(500).send('Failed to fetch instance details');
      }

      const status = instanceDetails.data.status;

      // Based on the status of the instance, decide to either reset or start the instance
      if (status === 'RUNNING') {
        await compute.instances.reset(request);
      } else if (status === 'TERMINATED' || status === 'STOPPED') {
        await compute.instances.start(request);
      }

      console.log(`VM instance ${instanceToRestart} operation completed.`);
      res.status(200).send(`Operation completed on ${instanceToRestart}`);
    } catch (err) {
      // Log errors and send a 500 response in case of exceptions
      console.error("Error:", err);
      res.status(500).send('Failed to perform operation on VM');
    }
  } else {
    // If no matching instance is found, send a 404 response
    res.status(404).send('No matching instance found');
  }
};