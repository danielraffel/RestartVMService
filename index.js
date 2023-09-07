const { google } = require('googleapis');
const compute = google.compute('v1');

exports.restartVM = async (req, res) => {
  // Validate the secret header
  const secret = process.env.secret;
  // Validate if the secret is in the body
  const payloadSecret = req.body.secret;

  // Check the Webhook response_state https://support.freshping.io/en/support/solutions/articles/50000003709-freshping-api-documentation#Check-Types
  const responseState = req.body.response_state;

  // Validate secret and check if the response state is 'Reporting Error'
  if ((req.headers['x-custom-secret'] !== secret && payloadSecret !== secret) || responseState !== 'Reporting Error') {
    return res.status(403).send('Forbidden or Not Reporting Error');
  }

  // Authenticate with Google Cloud
  const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  // The project to match 'gcloud config get-value project'
  const projectId = 'YOUR_PROJECT_ID';
  // The External Static IP to match 'gcloud compute instances list'
  const targetIP = 'YOUR_STATIC_IP';

  // Fetch the list of zones in the project
  const zonesResponse = await compute.zones.list({ project: projectId, auth: auth });
  const zones = zonesResponse.data.items.map(zone => zone.name);

  // Initialize variables to keep track of the instance to restart
  let maxInstanceNumber = -1;
  let instanceToRestart = null;
  let zoneToRestart = null;

  // Loop through each zone to fetch instances
  for (const zone of zones) {
    const instancesResponse = await compute.instances.list({ project: projectId, zone: zone, auth: auth });
    const instances = instancesResponse.data.items;

    // Loop through each instance to find the one to restart
    if (instances && instances.length > 0) {
      for (const instance of instances) {
        // Extract instance name and external IP
        const instanceName = instance.name;
        const externalIP = instance.networkInterfaces[0]?.accessConfigs[0]?.natIP;

        // Extract the last part of the instance name as a number
        const instanceNumber = parseInt(instanceName.split('-').pop(), 10);

        // Check if this instance has the highest number and matches the target IP
        if (instanceNumber > maxInstanceNumber && externalIP === targetIP) {
          maxInstanceNumber = instanceNumber;
          instanceToRestart = instanceName;
          zoneToRestart = zone;
        }
      }
    }
  }

  // If an instance to restart is found, proceed
  if (instanceToRestart) {
    // Create the request payload
    const request = {
      project: projectId,
      zone: zoneToRestart,
      instance: instanceToRestart,
      auth: auth
    };

    try {
      // Fetch the current status of the instance
      const instanceDetails = await compute.instances.get(request);
      const status = instanceDetails.data.status;

      let response;
      // If the instance is running, reset it
      if (status === 'RUNNING') {
        response = await compute.instances.reset(request);
      } 
      // If the instance is terminated or stopped, start it
      else if (status === 'TERMINATED' || status === 'STOPPED') {
        response = await compute.instances.start(request);
      }

      console.log(`VM instance ${instanceToRestart} operation completed:`, response.data);
      res.status(200).send(`Operation completed on ${instanceToRestart}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Failed to perform operation on VM');
    }
  } else {
    res.status(404).send('No matching instance found');
  }
};

