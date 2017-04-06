import { ArtichokeAPI } from "./api";
import { EventHandler } from "./events";
import { apiKey, config, log } from "./fixtures.spec";
import { createMedia } from "./media";
import { Media } from "./protocol/protocol";
import { ChatEdited } from "./protocol/events";

const roomId = "123";
const bob = "456";
function makeMedia(): Media {
  return {
    type: "media",
    id: "2323",
    user: bob,
    room: roomId,
    timestamp: 123,
    mimeType: "image/gif",
    content: "https://example.com/image.gif",
    description: "Some image!"
  };
}

class APIMock extends ArtichokeAPI {
  setDelivery = false;
  updatedArchivable = false;

  constructor() {
    super(apiKey, config.chat, log);
  }

  setDelivered(messageId, timestamp) {
    this.setDelivery = true;
  }

  updateArchivable(archivable, timestamp) {
    this.updatedArchivable = true;
    return Promise.resolve(archivable);
  }
}

describe("Media", () => {
  let events;
  let api;
  let media;

  beforeEach(() => {
    events = new EventHandler(log);
    api = new APIMock();
    media = createMedia(makeMedia(), log, events, api);
  });

  it("should allow editing", () => {
    expect(media.edited).not.toBeDefined();
    media.edit("edited description");
    expect(api.updatedArchivable).toBe(true);
    expect(media.edited).toBeDefined();
  });

  it("should run a callback on edit", (done) => {
    let edited = makeMedia();
    let description = "edited description";

    edited.description = description;
    edited.edited = {
      user: bob,
      timestamp: Date.now()
    };
    expect(media.edited).not.toBeDefined();

    media.onEdit((m) => {
      expect(m.description).toBe(description);
      expect(m.edited).toBeDefined();
      done();
    });

    events.notify({
      type: "chat_edited",
      id: media.id,
      archivable: edited
    } as ChatEdited);
  });
});
