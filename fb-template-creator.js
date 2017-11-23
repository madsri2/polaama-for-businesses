'use strict';

function FBTemplateCreator() {
}

FBTemplateCreator.text = function(obj) {
  if(!obj.fbid) throw new Error(`required argument 'fbid' missing`);
  if(!obj.text) throw new Error(`required argument 'text' missing`);
  const message = {
    recipient: {
      id: obj.fbid
    },
    message: {
      text: obj.text,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  return message;
}

FBTemplateCreator.generic = function(obj) {
  if(!obj.fbid) throw new Error(`required argument 'fbid' missing`);
  if(!obj.elements) throw new Error(`required argument 'elements' missing`);
  const message = {
    recipient: {
      id: obj.fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "generic",
          elements: obj.elements
        }
      }
    }
  };
  if(obj.buttons) message.message.attachment.payload.buttons = obj.buttons;
  return message;
}

FBTemplateCreator.buttons = function(obj) {
  if(!obj.fbid) throw new Error(`required argument 'fbid' missing`);
  if(!obj.buttons) throw new Error(`required argument 'buttons' missing`);
  if(!obj.text) throw new Error(`required argument 'text' missing`);
  const message = {
    recipient: {
      id: obj.fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "button",
          text: obj.text,
          buttons: obj.buttons,
        }
      }
    }
  };
  return message;
}

FBTemplateCreator.quickReply = function(obj) {
  if(!obj.fbid) throw new Error(`required argument 'fbid' missing`);
  const message = {
    recipient: {
      id: obj.fbid
    },
    message: {
      text: obj.text,
      quick_replies: obj.elements
    }
  };
  return message;
}

FBTemplateCreator.list = function(obj) {
  if(!obj.fbid) throw new Error(`required argument 'fbid' missing`);
  if(!obj.elements) throw new Error(`required argument 'elements' missing`);
  const message = {
    recipient: {
      id: obj.fbid
    },
    message: {
      attachment: {
        "type": "template",
        payload: {
          template_type: "list",
          elements: obj.elements
        }
      }
    }
  };
  if(obj.buttons) message.message.attachment.payload.buttons = obj.buttons;
  if(!obj.elements[0].image_url || obj.compact_top_element_style) message.message.attachment.payload.top_element_style = "compact";
  return message;
}

module.exports = FBTemplateCreator;
